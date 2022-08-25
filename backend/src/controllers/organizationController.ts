import { BodyParams, Controller, Get, Inject, Post } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { Format, Pattern, Required } from "@tsed/schema";
import API from 'common/api';
import { LinkExperience, LinkParams, MinOrg, MinRole, OrganizationMetadata, PatchEventType, PatchPermissions, PendingUser, ProtectedUser, Role, UserRole, AttributeCategory, MinAttributeCategory, MinTagCategory, TagCategory, Attribute, MinAttribute, MinTag, Tag, DefaultRoleIds, CategorizedItemUpdates, CategorizedItem, DefaultRoles } from "common/models";
import { APIController, OrgId } from ".";
import { RequireAllPermissions } from "../middlewares/userRoleMiddleware";
import { UserDoc } from "../models/user";
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
import STRINGS from "../../../common/strings"

export class ValidatedMinOrg implements MinOrg {
    @Required()
    name: string;
}

const twilioConfig = config.TWILIO.get();
const twilioClient = new Twilio(twilioConfig.sID, twilioConfig.token);

@Controller(API.namespaces.organization)
export class OrganizationController implements APIController<
    'createOrg' 
    | 'removeUserFromOrg' 
    | 'getTeamMembers' 
    | 'inviteUserToOrg'
    | 'getOrgMetadata'
    | 'editOrgMetadata'
    | 'editRole'
    | 'createNewRole'
    | 'deleteRoles'
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


    
    @Post(API.server.removeUserFromOrg())
    @RequireAllPermissions([PatchPermissions.RemoveFromOrg])
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
    


    @Post(API.server.addRolesToUser())
    @RequireAllPermissions([PatchPermissions.AssignRoles])
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
    @RequireAllPermissions([])
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
                throw new Unauthorized(STRINGS.ACCOUNT.notInOrg(usersNotInOrg, org.name))
            }

            return specificMembers

        } else {
            return orgMembers
        }
    }


    @Post(API.server.inviteUserToOrg())
    @RequireAllPermissions([PatchPermissions.InviteToOrg])
    async inviteUserToOrg(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @Format('email') @BodyParams('email') email: string, 
        @Required() @Pattern(/[0-9]{10}/) @BodyParams('phone') phone: string, 
        // can't get this to validate right
        @BodyParams('roleIds') roleIds: string[], 
        @BodyParams('attributes') attributes: CategorizedItem[], 
        @Required() @BodyParams('baseUrl') baseUrl: string
    ) {
        const org = await this.db.resolveOrganization(orgId)

        const existingUser = await this.db.getUser({ email });

        const pendingUser: PendingUser = {
            email,
            phone,
            roleIds,
            attributes,
            pendingId: uuid.v1()
        };

        await this.db.addPendingUserToOrg(org, pendingUser);

        let link: string;

        // TODO: retest this when we have the concept of being part of more than one org
        if (existingUser) {
            link = this.getLinkUrl<LinkExperience.JoinOrganization>(baseUrl, LinkExperience.JoinOrganization, {
                orgId,
                email,
                pendingId: pendingUser.pendingId    
            });
        } else {
            link = this.getLinkUrl<LinkExperience.SignUpThroughOrganization>(baseUrl, LinkExperience.SignUpThroughOrganization, {
                orgId,
                email,
                pendingId: pendingUser.pendingId
            });
        }

        const msg = STRINGS.ACCOUNT.joinOrg(org.name, link, !!existingUser);

        const sentMessage = await twilioClient.messages.create({
            from: twilioConfig.phoneNumber, 
            to: phone,
            body: msg
        })

        if (sentMessage.errorMessage) {
            throw STRINGS.ACCOUNT.twilioError(sentMessage.errorMessage)
        }

        return pendingUser;
    }

    @Get(API.server.getOrgMetadata())
    @RequireAllPermissions([])
    async getOrgMetadata(
        @OrgId() orgId: string,
        @User() user: UserDoc,
    ) {
        const org = await this.db.resolveOrganization(orgId);

        return {
            id: orgId,
            name: org.name,
            roleDefinitions: org.roleDefinitions,
            attributeCategories: org.attributeCategories,
            tagCategories: org.tagCategories,
            requestPrefix: org.requestPrefix
        }
    }

    @Post(API.server.editOrgMetadata())
    @RequireAllPermissions([PatchPermissions.EditOrgSettings])
    async editOrgMetadata(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('orgUpdates') orgUpdates: Partial<Pick<OrganizationMetadata, 'name' | 'requestPrefix'>>,
    ) {
        const org = await this.db.editOrgMetadata(orgId, orgUpdates)

        await this.pubSub.sys(PatchEventType.OrganizationEdited, { orgId: org.id });

        return {
            id: orgId,
            name: org.name,
            roleDefinitions: org.roleDefinitions,
            attributeCategories: org.attributeCategories,
            tagCategories: org.tagCategories,
            requestPrefix: org.requestPrefix
        }
    }

    @Post(API.server.editRole())
    @RequireAllPermissions([PatchPermissions.RoleAdmin])
    async editRole(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('roleUpdates') roleUpdates: AtLeast<Role, 'id'>,
    ) {
        const org = await this.db.resolveOrganization(orgId);

        // dissallowed in front end so should never happen but just in case
        if (roleUpdates.id == DefaultRoleIds.Admin) {
            const adminRoleName = DefaultRoles.find(def => def.id == DefaultRoleIds.Admin).name
            throw new BadRequest(STRINGS.SETTINGS.cannotEditRole(adminRoleName));
        }

        const updatedOrg = await this.db.editRole(orgId, roleUpdates);
        const updatedRole = updatedOrg.roleDefinitions.find(role => role.id == roleUpdates.id);

        await this.pubSub.sys(PatchEventType.OrganizationRoleEdited, { 
            orgId: orgId, 
            roleId: updatedRole.id
        });

        return updatedRole;
    }

    @Post(API.server.deleteRoles())
    @RequireAllPermissions([PatchPermissions.RoleAdmin])
    async deleteRoles(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('roleIds') roleIds: string[],
    ) {
        const org = await this.db.resolveOrganization(orgId);

        // dissallowed in front end so should never happen but just in case
        if (roleIds.includes(DefaultRoleIds.Anyone)) {
            const anyoneRoleName = DefaultRoles.find(def => def.id == DefaultRoleIds.Anyone).name
            throw new BadRequest(STRINGS.SETTINGS.cannotDeleteRole(anyoneRoleName));
        }

        // dissallowed in front end so should never happen but just in case
        if (roleIds.includes(DefaultRoleIds.Admin)) {
            const adminRoleName = DefaultRoles.find(def => def.id == DefaultRoleIds.Admin).name
            throw new BadRequest(STRINGS.SETTINGS.cannotDeleteRole(adminRoleName));
        }

        const updatedOrg = await this.db.removeRolesFromOrganization(org.id, roleIds);

        for (const roleId of roleIds) {
            await this.pubSub.sys(PatchEventType.OrganizationRoleDeleted, { 
                orgId: updatedOrg.id, 
                roleId: roleId
            });
        }

        return updatedOrg;
    }

    @Post(API.server.createNewRole())
    @RequireAllPermissions([PatchPermissions.RoleAdmin])
    async createNewRole(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @Required() @BodyParams('role') newRole: MinRole,
    ) {
        const [org, createdRole] = await this.db.addRoleToOrganization(newRole, orgId);

        await this.pubSub.sys(PatchEventType.OrganizationRoleCreated, {
            orgId: orgId,
            roleId: createdRole.id
        });

        return createdRole;
    }

    @Post(API.server.updateAttributes())
    @RequireAllPermissions([PatchPermissions.AttributeAdmin])
    async updateAttributes(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('updates') updates: CategorizedItemUpdates,
    ) {
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
    }

    @Post(API.server.updateTags())
    @RequireAllPermissions([PatchPermissions.TagAdmin])
    async updateTags(
        @OrgId() orgId: string,
        @User() user: UserDoc,
        @BodyParams('updates') updates: CategorizedItemUpdates,
    ) {
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
    }

    getLinkUrl<Exp extends LinkExperience>(baseUrl: string, exp: Exp, params: LinkParams[Exp]): string {
        const expoSection = baseUrl.startsWith('exp')
            ? '--/'
            :'';

        return `${baseUrl}/${expoSection}${exp}?${querystring.stringify(params)}`
    }

}