import { BodyParams, Controller, Get, Inject, Post, renderView } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { Authenticate } from "@tsed/passport";
import { Format, Pattern, Required } from "@tsed/schema";
import API from 'common/api';
import { LinkExperience, LinkParams, MinOrg, MinRole, OrganizationMetadata, PatchEventType, PatchPermissions, PendingUser, ProtectedUser, Role, AttributeCategory, MinAttributeCategory, MinTagCategory, TagCategory, Attribute, MinAttribute, MinTag, Tag, DefaultRoleIds, CategorizedItemUpdates, CategorizedItem, DefaultRoles, TeamMemberMetadata } from "common/models";
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
import STRINGS from "../../../common/strings";
import { getLinkUrl } from "./utils";

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
        const [ org, removedUser ] = await this.db.removeUserFromOrganization(orgId, userId, false);

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
        
        const protectedOrgMembers = protectedOrg.members;
        const protectedRemovedMembers = protectedOrg.removedMembers;

        if (userIds && userIds.length) {
            const orgMembers: ProtectedUser[] = [];
            const removedOrgMembers: ProtectedUser[] = [];
            const deletedUsers: string[] = [];

            for (const id of userIds) {
                const idx = protectedOrgMembers.findIndex(member => member.id == id);

                if (idx != -1) {
                    orgMembers.push(protectedOrgMembers[idx])
                } else {
                    const removedIdx = protectedRemovedMembers.findIndex(member => member.id == id);

                    if (removedIdx != -1) {
                        removedOrgMembers.push(protectedRemovedMembers[removedIdx])
                    } else {
                        deletedUsers.push(id);
                    }
                }
            }

            return {
                orgMembers,
                removedOrgMembers,
                deletedUsers
            } as TeamMemberMetadata

        } else {

            return {
                orgMembers: protectedOrgMembers,
                removedOrgMembers: protectedRemovedMembers,
                deletedUsers: []
            } as TeamMemberMetadata

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

        //user is already a member of the org
        if (existingUser && existingUser.organizations[orgId]) {
            throw STRINGS.ACCOUNT.errorMessages.alreadyAMember;
        }

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
            link = getLinkUrl<LinkExperience.JoinOrganization>(baseUrl, LinkExperience.JoinOrganization, {
                orgId,
                email,
                pendingId: pendingUser.pendingId    
            });
        } else {
            link = getLinkUrl<LinkExperience.SignUpThroughOrganization>(baseUrl, LinkExperience.SignUpThroughOrganization, {
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
        // TODO: enforce this type with a schema
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

        const { updatedOrg, updatedRequests, updatedUsers } = await this.db.removeRolesFromOrganization(org.id, roleIds);

        const updatedRequestIds = updatedRequests.map(req => req.id)
        const updatedUserIds = updatedUsers.map(user => user.id)

        for (const roleId of roleIds) {
            await this.pubSub.sys(PatchEventType.OrganizationRoleDeleted, { 
                orgId: updatedOrg.id, 
                roleId: roleId,
                updatedRequestIds,
                updatedUserIds
            });
        }

        return { 
            updatedUserIds, 
            updatedRequestIds 
        }
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

            // Delete items/whole categories
            const { updatedOrg, updatedUsers, updatedRequests } = await this.db.deleteAttributes(org, updates.deletedCategories, updates.deletedItems)
            org = updatedOrg

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

            const savedOrg = await org.save({ session });

            const savedUserIds: string[] = [];
            for (const user of updatedUsers) {
                await user.save({ session })
                savedUserIds.push(user.id)
            }

            const savedRequestIds: string[] = [];
            for (const request of updatedRequests) {
                await request.save({ session })
                savedRequestIds.push(request.id)
            }

            await this.pubSub.sys(PatchEventType.OrganizationAttributesUpdated, { 
                orgId: savedOrg.id,
                updatedRequestIds: savedRequestIds,
                updatedUserIds: savedUserIds,
                deletedCategoryIds: updates.deletedCategories,
                deletedItems: updates.deletedItems
            });

            return savedOrg;
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

            // delete tags
            const { updatedOrg, updatedRequests } = await this.db.deleteTags(org, updates.deletedCategories, updates.deletedItems)
            org = updatedOrg

            // add items
            for (const categoryId in updates.newItems) {
                const items: MinTag[] = updates.newItems[categoryId].map((name) => {
                    return { name }
                });

                // TODO: check why this works on it's own but fails if you also add a new category
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

            const savedOrg = await org.save({ session });

            const savedRequestIds: string[] = [];
            for (const request of updatedRequests) {
                await request.save({ session })
                savedRequestIds.push(request.id)
            }

            await this.pubSub.sys(PatchEventType.OrganizationTagsUpdated, { 
                orgId: savedOrg.id,
                updatedRequestIds: savedRequestIds,
                deletedCategoryIds: updates.deletedCategories,
                deletedItems: updates.deletedItems
            });

            return savedOrg;
        })
    }
}