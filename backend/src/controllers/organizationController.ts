import { BodyParams, Controller, Get, Inject, Post, Req } from "@tsed/common";
import { BadRequest, Forbidden, Unauthorized } from "@tsed/exceptions";
import { MongooseDocument } from "@tsed/mongoose";
import { Authenticate } from "@tsed/passport";
import { CollectionOf, Enum, Format, Minimum, Pattern, Required } from "@tsed/schema";
import API from 'common/api';
import { LinkExperience, LinkParams, MinOrg, MinRole, Organization, OrganizationMetadata, PatchEventType, PatchPermissions, PendingUser, ProtectedUser, RequestSkill, Role, UserRole, resolvePermissionsFromRoles, AttributeCategory, MinAttributeCategory, MinTagCategory, TagCategory, Attribute, MinAttribute, MinTag, Tag, AttributesMap, AttributeCategoryUpdates, TagCategoryUpdates, DefaultRoleIds, CategorizedItemUpdates, CategorizedItem } from "common/models";
import { APIController, OrgId } from ".";
import { RequireRoles } from "../middlewares/userRoleMiddleware";
import { UserDoc, UserModel } from "../models/user";
import { User } from "../protocols/jwtProtocol";
import { DBManager } from "../services/dbManager";
import Notifications from '../services/notifications';
import * as uuid from 'uuid';
import { Twilio } from 'twilio';
import * as querystring from 'querystring'
import config from '../config';
import { PubSubService } from "../services/pubSubService";
import { OrganizationDoc } from "../models/organization";
import { AtLeast } from "common";
import { request } from "express";

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}

const twilioConfig = config.TWILIO.get();
const twilioClient = new Twilio(twilioConfig.sID, twilioConfig.token);

@Controller(API.namespaces.organization)
export class OrganizationController implements APIController<
    'createOrg' 
    | 'addUserRoles' 
    | 'removeUserRoles' 
    | 'removeUserFromOrg' 
    | 'addUserToOrg' 
    | 'getTeamMembers' 
    | 'getRespondersOnDuty'
    | 'inviteUserToOrg'
    | 'getOrgMetadata'
    | 'editOrgMetadata'
    | 'editRole'
    | 'createNewRole'
    | 'deleteRoles'
    | "createNewAttributeCategory"
    | "editAttributeCategory"
    | "deleteAttributeCategory"
    | "createNewAttribute"
    | "editAttribute"
    | "deleteAttribute"
    | "createNewTagCategory"
    | "editTagCategory"
    | "deleteTagCategory"
    | "createNewTag"
    | "editTag"
    | "deleteTag"
    | "updateAttributes"
    | "updateTags"
    > {
    @Inject(DBManager) db: DBManager;

    // eventually these will probably also trigger notifications
    @Inject(Notifications) notifications: Notifications;
    @Inject(PubSubService) pubSub: PubSubService;

    @Post(API.server.createOrg())
    @Authenticate()
    async createOrg(
        @User() user: UserDoc,
        @Required() @BodyParams('org') minOrg: ValidatedMinOrg,
    ) {
        const [ org, admin ] = await this.db.createOrganization(minOrg, user.id);

        return {
            org: await this.db.protectedOrganization(org),
            user: this.db.me(admin)
        }
    }

    @Post(API.server.addUserToOrg())
    @RequireRoles([UserRole.Admin])
    async addUserToOrg(
        @OrgId() orgId: string,
        @Req() req,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[],
        @Required() @BodyParams('roleIds') roleIds: string[],
        @Required() @BodyParams('attributes') attributes: CategorizedItem[]
    ) {
        const [ org, user ] = await this.db.addUserToOrganization(orgId, userId, roles, roleIds, attributes);

        const res = {
            org: await this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(user)
        }

        await this.pubSub.sys(PatchEventType.UserAddedToOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.removeUserFromOrg())
    @RequireRoles([UserRole.Admin])
    async removeUserFromOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string
    ) {
        const [ org, removedUser ] = await this.db.removeUserFromOrganization(orgId, userId);

        const res = {
            org: await this.db.protectedOrganization(org),
            user: this.db.protectedUserFromDoc(removedUser)
        }

        await this.pubSub.sys(PatchEventType.UserRemovedFromOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.removeUserRoles())
    @RequireRoles([UserRole.Admin])
    async removeUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const res = this.db.protectedUserFromDoc(await this.db.removeUserRoles(orgId, userId, roles));

        await this.pubSub.sys(PatchEventType.UserChangedRolesInOrg, {
            userId,
            orgId
        })

        return res;
    }
    
    @Post(API.server.addUserRoles())
    @RequireRoles([UserRole.Admin])
    async addUserRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roles') roles: UserRole[]
    ) {
        const res = this.db.protectedUserFromDoc(await this.db.addUserRoles(orgId, userId, roles));

        await this.pubSub.sys(PatchEventType.UserChangedRolesInOrg, {
            userId,
            orgId
        })

        return res;
    }

    @Post(API.server.addRolesToUser())
    async addRolesToUser(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('userId') userId: string,
        @Required() @BodyParams('roleIds') roleIds: string[]
    ) {
        const res = this.db.protectedUserFromDoc(await this.db.addRolesToUser(orgId, userId, roleIds));

        // TODO: do we plan to create new events for the new concept or Roles or use the old events?
        await this.pubSub.sys(PatchEventType.UserChangedRolesInOrg, {
            userId,
            orgId
        })

        return res;
    }

    @Post(API.server.getTeamMembers())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getTeamMembers(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('userIds') userIds?: string[]
    ) {
        const org = await this.db.resolveOrganization(orgId);
        const protectedOrg = await this.db.protectedOrganization(org); 
        
        const orgMembers = protectedOrg.members;
        const removedOrgMembers = protectedOrg.removedMembers;

        if (userIds && userIds.length) {
            const specificMembers: ProtectedUser[] = [];
            const usersNotInOrg: string[] = [];

            for (const id of userIds) {
                const idx = orgMembers.findIndex(member => member.id == id);

                if (idx != -1) {
                    specificMembers.push(orgMembers[idx])
                } else {
                    const removedIdx = removedOrgMembers.findIndex(member => member.id == id);

                    if (removedIdx != -1) {
                        specificMembers.push(removedOrgMembers[removedIdx])
                    } else {
                        usersNotInOrg.push(id);
                    }
                }
            }

            if (usersNotInOrg.length) {
                throw new Unauthorized(`Users with ids: ${usersNotInOrg.join(', ')} are not in org: ${org.name}`)
            }

            return specificMembers

        } else {
            return orgMembers
        }
    }

    @Get(API.server.getRespondersOnDuty())
    @RequireRoles([UserRole.Admin, UserRole.Dispatcher, UserRole.Responder])
    async getRespondersOnDuty(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        return await this.db.getOrgResponders(orgId); // TODO: then filter by who's on duty
    }

    @Post(API.server.inviteUserToOrg())
    @RequireRoles([UserRole.Admin])
    async inviteUserToOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @Format('email') @BodyParams('email') email: string, 
        @Required() @Pattern(/[0-9]{10}/) @BodyParams('phone') phone: string, 
        // can't get this to validate right
        @Required() @BodyParams('roles') roles: UserRole[], 
        @Required() @BodyParams('roleIds') roleIds: string[], 
        @Required() @BodyParams('attributes') attributes: CategorizedItem[], 
        @Required() @BodyParams('skills') skills: RequestSkill[], 
        @Required() @BodyParams('baseUrl') baseUrl: string
    ) {

        if (!roles.length) {
            throw new BadRequest('You must invite a user with at least one role.')
        }

        const org = await this.db.resolveOrganization(orgId)

        const existingUser = await this.db.getUser({ email });

        const pendingUser: PendingUser = {
            email,
            phone,
            roles,
            roleIds,
            attributes,
            skills,
            pendingId: uuid.v1()
        };

        await this.db.addPendingUserToOrg(org, pendingUser);

        let link: string,
            msg: string;


        // TODO: retest this when we have the concept of being part of more than one org
        if (existingUser) {
            link = this.getLinkUrl<LinkExperience.JoinOrganization>(baseUrl, LinkExperience.JoinOrganization, {
                orgId,
                email,
                roles,
                pendingId: pendingUser.pendingId    
            });

            msg = `You have been invited to join '${org.name}' on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join '${org.name}'.\n${link}`;
        } else {
            link = this.getLinkUrl<LinkExperience.SignUpThroughOrganization>(baseUrl, LinkExperience.SignUpThroughOrganization, {
                orgId,
                email,
                roles,
                skills,
                pendingId: pendingUser.pendingId
            });

            msg = `You have been invited to sign up and join '${org.name}' on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join '${org.name}'.\n${link}`;
        }

        const sentMessage = await twilioClient.messages.create({
            from: twilioConfig.phoneNumber, 
            to: phone,
            body: msg
        })

        if (sentMessage.errorMessage) {
            throw `Twilio Error: ${sentMessage.errorMessage}`
        }

        return pendingUser;
    }

    @Get(API.server.getOrgMetadata())
    @Authenticate()
    async getOrgMetadata(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        const orgConfig = user.organizations && user.organizations[orgId];
        if (!orgConfig) {
            throw new Forbidden(`You do not have access to the requested org.`);
        }

        const org = await this.db.resolveOrganization(orgId);
        return {
            id: orgId,
            name: org.name,
            roleDefinitions: org.roleDefinitions,
            attributeCategories: org.attributeCategories,
            tagCategories: org.tagCategories
        }
    }

    @Post(API.server.editOrgMetadata())
    @Authenticate()
    async editOrgMetadata(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('orgUpdates') orgUpdates: Partial<OrganizationMetadata>,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.EditOrgSettings])) {
            const org = await this.db.editOrgMetadata(orgId, orgUpdates)

            await this.pubSub.sys(PatchEventType.OrganizationEdited, { orgId: org.id });

            return {
                id: orgId,
                name: org.name,
                roleDefinitions: org.roleDefinitions,
                attributeCategories: org.attributeCategories,
                tagCategories: org.tagCategories
            }
        }

        throw new Unauthorized('You do not have permission to edit information about this organization.');
    }

    @Post(API.server.editRole())
    @Authenticate()
    async editRole(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('roleUpdates') roleUpdates: AtLeast<Role, 'id'>,
    ) {
        const org = await this.db.resolveOrganization(orgId);

        if (await this.userHasPermissions(user, org, [PatchPermissions.RoleAdmin])) {

            // dissallowed in front end so should never happen but just in case
            if (roleUpdates.id == DefaultRoleIds.Admin) {
                const adminRoleName = org.roleDefinitions.find(def => def.id == DefaultRoleIds.Admin)?.name || 'Admin';
                throw new BadRequest(`The '${adminRoleName}' role cannot be edited`);
            }

            const updatedOrg = await this.db.editRole(orgId, roleUpdates);
            const updatedRole = updatedOrg.roleDefinitions.find(role => role.id == roleUpdates.id);
    
            await this.pubSub.sys(PatchEventType.OrganizationRoleEdited, { 
                orgId: orgId, 
                roleId: updatedRole.id
            });

            return updatedRole;
        }

        throw new Unauthorized('You do not have permission to edit Roles for this organization.');
    }

    @Post(API.server.deleteRoles())
    @Authenticate()
    async deleteRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('roleIds') roleIds: string[],
    ) {
        const org = await this.db.resolveOrganization(orgId);

        if (await this.userHasPermissions(user, org, [PatchPermissions.RoleAdmin])) {
            // dissallowed in front end so should never happen but just in case
            if (roleIds.includes(DefaultRoleIds.Anyone)) {
                const anyoneRoleName = org.roleDefinitions.find(def => def.id == DefaultRoleIds.Anyone)?.name || 'Anyone';
                throw new BadRequest(`The '${anyoneRoleName}' role cannot be deleted`);
            }

            // dissallowed in front end so should never happen but just in case
            if (roleIds.includes(DefaultRoleIds.Admin)) {
                const adminRoleName = org.roleDefinitions.find(def => def.id == DefaultRoleIds.Admin)?.name || 'Admin';
                throw new BadRequest(`The '${adminRoleName}' role cannot be deleted`);
            }

            const updatedOrg = await this.db.removeRolesFromOrganization(org.id, roleIds);

            for (const roleId of roleIds) {
                await this.pubSub.sys(PatchEventType.OrganizationRoleDeleted, { 
                    orgId: updatedOrg.id, 
                    roleId: roleId
                });
            }

            return updatedOrg;
        } else {
            throw new Unauthorized('You do not have permission to remove Roles from this organization.');
        }
    }

    @Post(API.server.createNewRole())
    @Authenticate()
    async createNewRole(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('role') newRole: MinRole,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.RoleAdmin]))
        {
            const [org, createdRole] = await this.db.addRoleToOrganization(newRole, orgId);

            await this.pubSub.sys(PatchEventType.OrganizationRoleCreated, {
                orgId: orgId,
                roleId: createdRole.id
            });

            return createdRole;
        }

        throw new Unauthorized('You do not have permission to create a new Role for this organization.');
    }

    @Post(API.server.createNewAttributeCategory())
    @Authenticate()
    async createNewAttributeCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('category') newCategory: MinAttributeCategory,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin]))
        {
            const [org, createdCategory] = await this.db.addAttributeCategoryToOrganization(orgId, newCategory);

            await this.pubSub.sys(PatchEventType.OrganizationAttributeCategoryCreated, {
                orgId: orgId,
                categoryId: createdCategory.id
            });

            return createdCategory;
        }

        throw new Unauthorized('You do not have permission to create a new Attribute Category for this organization.');
    }

    @Post(API.server.editAttributeCategory())
    @Authenticate()
    async editAttributeCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryUpdates') categoryUpdates: AttributeCategoryUpdates,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin])) {
            const [org, updatedCategory] = await this.db.editAttributeCategory(orgId, categoryUpdates);
    
            await this.pubSub.sys(PatchEventType.OrganizationAttributeCategoryEdited, { 
                orgId: orgId, 
                categoryId: updatedCategory.id
            });

            return updatedCategory;
        }

        throw new Unauthorized('You do not have permission to edit Attribute Categories for this organization.');
    }

    @Post(API.server.deleteAttributeCategory())
    @Authenticate()
    async deleteAttributeCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('categoryId') categoryId: string,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin])) {
            const org = await this.db.removeAttributeCategory(orgId, categoryId);

            await this.pubSub.sys(PatchEventType.OrganizationAttributeCategoryDeleted, { 
                orgId: orgId, 
                categoryId: categoryId
            });

            return org;
        } else {
            throw new Unauthorized('You do not have permission to remove Attribute Categories from this organization.');
        }
    }

    @Post(API.server.createNewAttribute())
    @Authenticate()
    async createNewAttribute(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryId') categoryId: string,
        @Required() @BodyParams('attribute') attribute: MinAttribute,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin]))
        {
            const [org, createdAttribute] = await this.db.addAttributeToOrganization(orgId, categoryId, attribute);

            await this.pubSub.sys(PatchEventType.OrganizationAttributeCreated, {
                orgId: orgId,
                categoryId: categoryId,
                attributeId: createdAttribute.id
            });

            return createdAttribute;
        }

        throw new Unauthorized('You do not have permission to create a new Attribute for this organization.');
    }

    @Post(API.server.editAttribute())
    @Authenticate()
    async editAttribute(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryId') categoryId: string,
        @Required() @BodyParams('attributeUpdates') attributeUpdates: AtLeast<Attribute, "id">,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin])) {
            const [org, updatedAttribute] = await this.db.editAttribute(orgId, categoryId, attributeUpdates);
    
            await this.pubSub.sys(PatchEventType.OrganizationAttributeEdited, { 
                orgId: orgId,
                categoryId: categoryId,
                attributeId: updatedAttribute.id
            });

            return updatedAttribute;
        }

        throw new Unauthorized('You do not have permission to edit Attributes for this organization.');
    }

    @Post(API.server.deleteAttribute())
    @Authenticate()
    async deleteAttribute(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('categoryId') categoryId: string,
        @BodyParams('attributeId') attributeId: string,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.AttributeAdmin])) {
            const org = await this.db.removeAttribute(orgId, categoryId, attributeId);

            await this.pubSub.sys(PatchEventType.OrganizationAttributeDeleted, { 
                orgId: orgId,
                categoryId: categoryId,
                attributeId: attributeId
            });

            return org;
        } else {
            throw new Unauthorized('You do not have permission to remove Attributes from this organization.');
        }
    }

    @Post(API.server.createNewTagCategory())
    @Authenticate()
    async createNewTagCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('category') newCategory: MinTagCategory,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin]))
        {
            const [org, createdCategory] = await this.db.addTagCategoryToOrganization(orgId, newCategory);

            await this.pubSub.sys(PatchEventType.OrganizationTagCategoryCreated, {
                orgId: orgId,
                categoryId: createdCategory.id
            });

            return createdCategory;
        }

        throw new Unauthorized('You do not have permission to create a new Tag Category for this organization.');
    }

    @Post(API.server.editTagCategory())
    @Authenticate()
    async editTagCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryUpdates') categoryUpdates: TagCategoryUpdates,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {
            const [org, updatedCategory] = await this.db.editTagCategory(orgId, categoryUpdates);
    
            await this.pubSub.sys(PatchEventType.OrganizationTagCategoryEdited, { 
                orgId: orgId, 
                categoryId: updatedCategory.id
            });

            return updatedCategory;
        }

        throw new Unauthorized('You do not have permission to edit Tag Categories for this organization.');
    }

    @Post(API.server.deleteTagCategory())
    @Authenticate()
    async deleteTagCategory(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('categoryId') categoryId: string,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {
            const org = await this.db.removeTagCategory(orgId, categoryId);

            await this.pubSub.sys(PatchEventType.OrganizationTagCategoryDeleted, { 
                orgId: orgId, 
                categoryId: categoryId
            });

            return org;
        } else {
            throw new Unauthorized('You do not have permission to remove Tag Categories from this organization.');
        }
    }

    @Post(API.server.createNewTag())
    @Authenticate()
    async createNewTag(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryId') categoryId: string,
        @Required() @BodyParams('tag') tag: MinTag,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin]))
        {
            const [org, createdTag] = await this.db.addTagToOrganization(orgId, categoryId, tag);

            await this.pubSub.sys(PatchEventType.OrganizationTagCreated, {
                orgId: orgId,
                categoryId: categoryId,
                tagId: createdTag.id
            });

            return createdTag;
        }

        throw new Unauthorized('You do not have permission to create a new Tag for this organization.');
    }

    @Post(API.server.editTag())
    @Authenticate()
    async editTag(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('categoryId') categoryId: string,
        @Required() @BodyParams('tagUpdates') tagUpdates: AtLeast<Tag, "id">,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {
            const [org, updatedTag] = await this.db.editTag(orgId, categoryId, tagUpdates);
    
            await this.pubSub.sys(PatchEventType.OrganizationTagEdited, { 
                orgId: orgId,
                categoryId: categoryId,
                tagId: updatedTag.id
            });

            return updatedTag;
        }

        throw new Unauthorized('You do not have permission to edit Tags for this organization.');
    }

    @Post(API.server.deleteTag())
    @Authenticate()
    async deleteTag(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('categoryId') categoryId: string,
        @BodyParams('tagId') tagId: string,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {
            const org = await this.db.removeTag(orgId, categoryId, tagId);

            await this.pubSub.sys(PatchEventType.OrganizationTagDeleted, { 
                orgId: orgId,
                categoryId: categoryId,
                tagId: tagId
            });

            return org;
        } else {
            throw new Unauthorized('You do not have permission to remove Tags from this organization.');
        }
    }

    @Post(API.server.updateAttributes())
    @Authenticate()
    async updateAttributes(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('updates') updates: CategorizedItemUpdates,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {            
            return await this.db.transaction(async (session) => {
                let org: OrganizationDoc, 
                    editedAttributeCategories: AttributeCategory[], 
                    editedAttributes: (AtLeast<Attribute, 'id'> & { categoryId: string })[],
                    newAttributes: Attribute[],
                    newAttributeCategories: AttributeCategory[];

                const deletedItems: CategorizedItem[] = [];
                const deletedCategories: string[] = [];

                // Edit Categories
                [org, editedAttributeCategories] = await this.db.editAttributeCategories(orgId, updates.categoryNameChanges);
                
                // Edit Items (Attributes)
                [org, editedAttributes] = await this.db.editAttributes(org, updates.itemNameChanges.map((change) => {
                    return {
                        name: change.name,
                        categoryId: change.categoryId,
                        id: change.itemId
                    }
                }))

                // Delete Items (Attributes)
                for (const categoryId in updates.deletedItems) {
                    // deleting a category deletes its items
                    if (updates.deletedCategories.includes(categoryId)) {
                        continue;
                    }

                    const itemsToDelete = updates.deletedItems[categoryId];

                    for (const itemId of itemsToDelete) {
                        org = await this.db.removeAttributeWithSession(org, categoryId, itemId, session)
                        deletedItems.push({ categoryId, itemId })
                    }
                }

                // Delete Categories
                for (const categoryToDelete of updates.deletedCategories) {
                    org = await this.db.removeAttributeCategoryWithSession(org, categoryToDelete, session)
                    deletedCategories.push(categoryToDelete)
                }

                // add items
                for (const categoryId in updates.newItems) {
                    const items: MinAttribute[] = updates.newItems[categoryId].map((name) => {
                        return { name }
                    });

                    [org, newAttributes] = await this.db.addAttributesToOrganization(org, categoryId, items)
                }

                // add categories
                const minNewCategories: MinAttributeCategory[] = []
                for (const categoryId in updates.newCategories) {
                    const category = updates.newCategories[categoryId];

                    minNewCategories.push({ 
                        name: category.name,
                        attributes: category.items
                    })
                }

                [org, newAttributeCategories] = await this.db.addAttributeCategoriesToOrganization(org, minNewCategories)

                const updatedOrg = await org.save({ session });

                await this.pubSub.sys(PatchEventType.OrganizationAttributesUpdated, { 
                    orgId: updatedOrg.id
                });

                return updatedOrg;
            })
        } else {
            throw new Unauthorized('You do not have permission to remove Tags from this organization.');
        }
    }

    @Post(API.server.updateTags())
    @Authenticate()
    async updateTags(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('updates') updates: CategorizedItemUpdates,
    ) {
        if (await this.userHasPermissions(user, orgId, [PatchPermissions.TagAdmin])) {            
            return await this.db.transaction(async (session) => {
                let org: OrganizationDoc, 
                    editedTagCategories: TagCategory[], 
                    editedTags: (AtLeast<Tag, 'id'> & { categoryId: string })[],
                    newTags: Tag[],
                    newTagCategories: TagCategory[];

                const deletedItems: CategorizedItem[] = [];
                const deletedCategories: string[] = [];

                // Edit Categories
                [org, editedTagCategories] = await this.db.editTagCategories(orgId, updates.categoryNameChanges);
                
                // Edit Items (Tags)
                [org, editedTags] = await this.db.editTags(org, updates.itemNameChanges.map((change) => {
                    return {
                        name: change.name,
                        categoryId: change.categoryId,
                        id: change.itemId
                    }
                }))

                // Delete Items (Tags)
                for (const categoryId in updates.deletedItems) {
                    // deleting a category deletes its items
                    if (updates.deletedCategories.includes(categoryId)) {
                        continue;
                    }

                    const itemsToDelete = updates.deletedItems[categoryId];

                    for (const itemId of itemsToDelete) {
                        org = await this.db.removeTagWithSession(org, categoryId, itemId, session)
                        deletedItems.push({ categoryId, itemId })
                    }
                }

                // Delete Categories
                for (const categoryToDelete of updates.deletedCategories) {
                    org = await this.db.removeTagCategoryWithSession(org, categoryToDelete, session)
                    deletedCategories.push(categoryToDelete)
                }

                // add items
                for (const categoryId in updates.newItems) {
                    const items: MinTag[] = updates.newItems[categoryId].map((name) => {
                        return { name }
                    });

                    [org, newTags] = await this.db.addTagsToOrganization(org, categoryId, items)
                }

                // add categories
                const minNewCategories: MinTagCategory[] = []
                for (const categoryId in updates.newCategories) {
                    const category = updates.newCategories[categoryId];

                    minNewCategories.push({ 
                        name: category.name,
                        tags: category.items
                    })
                }

                [org, newTagCategories] = await this.db.addTagCategoriesToOrganization(org, minNewCategories)

                const updatedOrg = await org.save({ session });

                await this.pubSub.sys(PatchEventType.OrganizationTagsUpdated, { 
                    orgId: updatedOrg.id
                });

                return updatedOrg;
            })
        } else {
            throw new Unauthorized('You do not have permission to remove Tags from this organization.');
        }
    }

    getLinkUrl<Exp extends LinkExperience>(baseUrl: string, exp: Exp, params: LinkParams[Exp]): string {
        const expoSection = baseUrl.startsWith('exp')
            ? '--/'
            :'';

        return `${baseUrl}/${expoSection}${exp}?${querystring.stringify(params)}`
    }

    async userHasPermissions(user: UserDoc, orgId: string | OrganizationDoc, requiredPermissions: PatchPermissions[]): Promise<boolean> {
        const org = await this.db.resolveOrganization(orgId);

        const orgConfig = user.organizations && user.organizations[org.id];
        if (!orgConfig) {
            throw new Forbidden(`You do not have access to the requested org.`);
        }

        // Get all the roles that belong to a user.
        const userRoles = [];
        orgConfig.roleIds.forEach(id => {
            const assignedRole = org.roleDefinitions.find(
                roleDef => roleDef.id == id
            );    
            if (assignedRole) {
                userRoles.push(assignedRole);
            }
        });

        // Resolve all the permissions granted to a user based on their role(s).
        const userPermissions = resolvePermissionsFromRoles(userRoles);
        for (const permission of requiredPermissions) {
            // If any required permission is missing, return false.
            if (!userPermissions.has(permission as PatchPermissions)) {
                return false;
            }
        }

        // If we make it here then all required permissions were found.
        return true;
    }
}