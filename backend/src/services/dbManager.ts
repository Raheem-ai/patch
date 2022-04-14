import { Inject, Service } from "@tsed/di";
import { Ref } from "@tsed/mongoose";
import { Attribute, AttributeCategory, AttributeCategoryUpdates, AttributeHandle, Chat, ChatMessage, HelpRequest, Me, MinAttribute, MinAttributeCategory, MinHelpRequest, MinOrg, MinRole, MinTag, MinTagCategory, MinUser, NotificationType, Organization, OrganizationMetadata, PatchPermissions, PendingUser, ProtectedUser, RequestSkill, RequestStatus, RequestType, Role, Tag, TagCategory, TagCategoryUpdates, User, UserOrgConfig, UserRole } from "common/models";
import { UserDoc, UserModel } from "../models/user";
import { OrganizationDoc, OrganizationModel } from "../models/organization";
import { Agenda, Every } from "@tsed/agenda";
import { inspect } from "util";
import {MongooseService} from "@tsed/mongoose";
import { ClientSession, Document, FilterQuery, Model, Query } from "mongoose";
import { Populated } from "../models";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import randomColor from 'randomcolor';
import * as uuid from 'uuid';
import timespace from '@mapbox/timespace';
import { AtLeast } from "common";
import moment from 'moment';
import Notifications, { NotificationMetadata } from "./notifications";
import { PubSubService } from "./pubSubService";

type DocFromModel<T extends Model<any>> = T extends Model<infer Doc> ? Document & Doc : never;

@Agenda()
@Service()
export class DBManager {
    
    @Inject(UserModel) users: Model<UserModel>;
    @Inject(OrganizationModel) orgs: Model<OrganizationModel>;
    @Inject(HelpRequestModel) requests: Model<HelpRequestModel>

    @Inject(MongooseService) db: MongooseService;
    @Inject(PubSubService) pubSub: PubSubService;
    // @Inject(Notifications) notifications: Notifications;

    // the 'me' api handles returning non-system props along with personal
    // ones so the user has access...everywhere else a user is 
    // visible should only show non-system/personal properties
    privateUserProps() {
        return Object.assign({}, UserModel.systemProperties, UserModel.personalProperties);
    }

    protectedUserFromDoc(user: UserDoc): ProtectedUser {
        const userJson = user.toJSON();
        return this.protectedUser(userJson);
    }

    protectedUser(user: User): ProtectedUser {
        for (const key in UserModel.systemProperties) {
            user[key] = undefined
        }

        for (const key in UserModel.personalProperties) {
            user[key] = undefined
        }

        return user
    }

    me(user: UserDoc): Me {
        const pubUser = user.toObject({ virtuals: true });

        // strip private fields off here so all other server side apis can have access to
        // them with the initial call to the db to check auth
        for (const key in UserModel.systemProperties) {
            pubUser[key] = undefined
        }

        return pubUser;
    }

    async protectedOrganization(org: OrganizationDoc): Promise<Organization> {
        const membersPopulated = org.populated('members');
        const removedMembersPopulated = org.populated('removedMembers');

        if (!membersPopulated) {
            org = await org.populate({ path: 'members', select: this.privateUserProps() }).execPopulate();
        }

        if (!removedMembersPopulated) {
            org = await org.populate({ path: 'removedMembers', select: this.privateUserProps() }).execPopulate();
        }

        const jsonOrg = org.toJSON() as Organization;

        jsonOrg.members = jsonOrg.members.map(this.protectedUser);
        jsonOrg.removedMembers = jsonOrg.removedMembers.map(this.protectedUser);

        return jsonOrg;
    }

    async createUser(user: Partial<UserModel>): Promise<UserDoc> {
        user.auth_etag = user.auth_etag || uuid.v1();
        user.displayColor = user.displayColor || randomColor({
            hue: '#DB0000'
        });

        const newUser = new this.users(user)
        user.organizations = {};

        return await newUser.save();
    }

    async createUserThroughOrg(orgId: string | OrganizationDoc, pendingId: string, user: MinUser) {
        const org = await this.resolveOrganization(orgId);
        const idx = org?.pendingUsers?.findIndex(u => u.pendingId == pendingId);

        if (idx != -1) {
            const pendingUser = org.pendingUsers[idx];
            
            const newUser = await this.createUser(Object.assign(
                {}, 
                user, 
                { 
                    skills: pendingUser.skills, 
                    email: pendingUser.email, 
                    phone: pendingUser.phone 
                }
            ));

            org.pendingUsers.splice(idx, 1);

            // TODO: if skills are vetted by org this is where they should be set
            return await this.addUserToOrganization(org, newUser, pendingUser.roles, pendingUser.roleIds, pendingUser.attributes);
        } else {
            throw `Invite for user with email ${user.email} to join '${org.name}' not found`
        }
    }

    async createOrganization(minOrg: Partial<OrganizationModel>, adminId: string) {
        return this.transaction(async (session) => {
            const newOrg: Partial<OrganizationModel> = { ...minOrg, 
                lastRequestId: 0, 
                lastDayTimestamp: new Date().toISOString()
            }

            const org = await (new this.orgs(newOrg)).save({ session })

            return await this.addUserToOrganization(org, adminId, [UserRole.Admin], [], [], session)
        })
    }
    
    async getUser(query: Partial<UserModel>): Promise<UserDoc> {
        return await this.users.findOne(query);
    }

    async getUsers(query: Partial<UserModel>): Promise<UserDoc[]> {
        return await this.users.find(query);
    }

    async getUsersByIds(ids: string[]): Promise<UserDoc[]> {
        return await this.findByIds(this.users, ids);
    }

    async getUserById(id: string): Promise<UserDoc> {
        return await this.findById(this.users, id);
    }

    async getProtectedUser(query: Partial<UserModel>): Promise<Document<ProtectedUser>> {
        return await this.users.findOne(query).select(this.privateUserProps());
    }

    async getProtectedUsers(query: Partial<UserModel>): Promise<Document<ProtectedUser>[]> {
        return await this.users.find(query).select(this.privateUserProps());
    }

    async getOrganization(query: Partial<OrganizationModel>): Promise<OrganizationDoc> {
        return await this.orgs.findOne(query).populate('members')
    }

    async getOrganizations(query: Partial<OrganizationModel>): Promise<OrganizationDoc[]> {
        return await this.orgs.find(query).populate('members')
    }

    async getOrgResponders(orgId: string): Promise<ProtectedUser[]> {
        const org = await this.resolveOrganization(orgId);
        const responders: ProtectedUser[] = []

        for (const possibleMember of org.members as Ref<UserDoc>[]) {
            const member = await this.resolveUser(possibleMember);
            const roles = member.organizations[orgId].roles;

            if (!!roles && roles.includes(UserRole.Responder)) {
                responders.push(this.protectedUserFromDoc(member));
            }
        }

        return responders;
    }

    async updateHelpRequestChat(helpReq: string | HelpRequestDoc, cb: (chat?: Chat) => Chat) {
        const req = await this.resolveRequest(helpReq);
        
        const updatedChat = cb(req.chat);
        req.chat = updatedChat;

        req.markModified('chat');
    }

    async updateUsersOrgConfig(userOrId: string | UserDoc, orgId: string, cb: (orgConfig?: UserOrgConfig) => UserOrgConfig) {
        const user = await this.resolveUser(userOrId);
        const orgConfig = user.organizations[orgId];
        
        const newConfig = cb(orgConfig);
        user.organizations[orgId] = newConfig;

        user.markModified('organizations');
    }

    async updateUser(userOrId: string | UserDoc, updatedUser: Partial<Omit<User, 'organizations'>>) {
        const user = await this.resolveUser(userOrId);

        for (const prop in updatedUser) {
            if (prop == 'organizations') {
                continue;
            }

            user[prop] = updatedUser[prop];
        }

        return await user.save()
    }

    async addUserToOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc, roles: UserRole[], roleIds: string[], attributes: AttributeHandle[], session?: ClientSession) {
        const user = await this.resolveUser(userId);
        const org = await this.resolveOrganization(orgId);

        user.organizations ||= {};

        if (user.organizations[org.id]) {
            throw `User is already a member of the organization`
        } else {
            await this.updateUsersOrgConfig(user, org.id, (_) => ({
                roles: roles,
                roleIds: roleIds,
                attributes: attributes,
                onDuty: false
            }))
        }

        // add the userId to the members array
        org.members.push(userId)

        // save both in transaction
        return this.transaction(async (session) => {
            return [
                await org.save({ session }),
                await user.save({ session })
            ] as [ OrganizationDoc, UserDoc ];
        }, session)
    }

    async removeUserFromOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc) {
        const user = await this.resolveUser(userId);

        const org = await this.resolveOrganization(orgId);

        // remove the entry in the organization map under the org key
        if (user.organizations && user.organizations[org.id]) {
            //effectively deleting
            await this.updateUsersOrgConfig(user, org.id, (_) => null)
        } 

        // remove the userId from the members array
        org.members.splice(org.members.findIndex((m) => {
            if (typeof m === 'string') {
                return m === userId
            } else {
                return m.id === userId
            }
        }), 1)

        org.removedMembers ||= []
        org.removedMembers.push(userId);

        // save both
        return this.transaction(async (session) => {
            return [
                await org.save({ session }),
                await user.save({ session })
            ] as [ OrganizationDoc, UserDoc ];
        })
    }

    // TODO: deprecate
    async addUserRoles(orgId: string, userId: string | UserDoc, roles: UserRole[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        } else {
            await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
                const rollSet = new Set(orgConfig.roles);

                roles.forEach(r => rollSet.add(r));

                return Object.assign({}, orgConfig, { roles: Array.from(rollSet.values()) });
            })

            return await user.save();
        }
    }

    async removeUserRoles(orgId: string, userId: string | UserDoc, roles: UserRole[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        } else {
            await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
                const rollSet = new Set(orgConfig.roles);

                roles.forEach(r => rollSet.delete(r));

                return Object.assign({}, orgConfig, { roles: Array.from(rollSet.values()) });
            })
        
            return await user.save();
        }
    }

    async addPendingUserToOrg(orgId: string | OrganizationDoc, pendingUser: PendingUser) {
        const org = await this.resolveOrganization(orgId);

        // TODO: we should put an orgInvites field or something on the user (if they already exist)
        // so you can know you have invites without having to do a huge search across every org
        // in the db...then this would update with the user (if they exist) in a transaction
        org.pendingUsers.push(pendingUser)

        await org.save()
    }

    async editOrgMetadata(orgId: string, orgUpdates: Partial<OrganizationMetadata>): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);

        for (const prop in orgUpdates) {
            org[prop] = orgUpdates[prop];
            org.markModified(prop);
        }

        return await org.save()
    }

    // Roles
    async editRole(orgId: string, roleUpdates: AtLeast<Role, 'id'>): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const roleIndex = org.roleDefinitions.findIndex(role => role.id == roleUpdates.id);
        if (roleIndex >= 0) {
            for (const prop in roleUpdates) {
                org.roleDefinitions[roleIndex][prop] = roleUpdates[prop];
            }
            org.markModified('roleDefinitions');
            return await org.save();
        }

        throw `Unknown role ${roleUpdates.id} in organization ${orgId}`;
    }

    async addRoleToOrganization(minRole: MinRole, orgId: string): Promise<[OrganizationDoc, Role]> {
        const org = await this.resolveOrganization(orgId)
        const newRole: Role = {
            id: uuid.v1(),
            name: '',
            permissions: []
        }

        for (const prop in minRole) {
            newRole[prop] = minRole[prop]
        }

        org.roleDefinitions.push(newRole)
        return [
            await org.save(),
            newRole
        ];
    }

    async removeRolesFromOrganization(orgId: string, roleIds: string[]): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);

        return this.transaction(async (session) => {
            // Remove the role ID from users currently assigned this role.
            for (const member of org.members as UserModel[]) {
                let userModified = false;
                for (const id of roleIds) {
                    // Identify any roles for deletion that currently belong to this user.
                    let roleIndex = member.organizations[orgId].roleIds.findIndex(roleID => roleID == id);
                    if (roleIndex >= 0) {
                        // Remove the role from the user's list of roles, and mark this user as modified.
                        member.organizations[orgId].roleIds.splice(roleIndex, 1)
                        userModified = true;
                    }
                }

                // If the user was modified, we need to get the UserDoc and save the user.
                if (userModified) {
                    const user = await this.getUserById(member.id);
                    user.organizations[orgId].roleIds = member.organizations[orgId].roleIds;
                    user.markModified('organizations');
                    await user.save({ session });
                }
            }

            // Now remove the roles from the org definition.
            org.roleDefinitions = org.roleDefinitions.filter(role => !roleIds.includes(role.id));
            org.markModified('roleDefinitions');
            return await org.save({ session });
        })
    }

    async addRolesToUser(orgId: string, userId: string | UserDoc, roleIds: string[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        }

        const org = await this.resolveOrganization(orgId);
        for (const roleId of roleIds) {
            if (!org.roleDefinitions.some(roleDef => roleDef.id == roleId)) {
                throw `Role  ${roleId} does not exist in organization ${orgId}.`
            }
        }

        await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
            const roleSet = new Set(orgConfig.roleIds);
            roleIds.forEach(r => roleSet.add(r));
            return Object.assign({}, orgConfig, { roleIds: Array.from(roleSet.values()) });
        })

        return await user.save();
    }

    // Attributes
    async addAttributeCategoryToOrganization(orgId: string, minCategory: MinAttributeCategory): Promise<[OrganizationDoc, AttributeCategory]> {
        const org = await this.resolveOrganization(orgId)

        if (this.checkForDupes(minCategory.name, org.attributeCategories)) {
            throw `Already an Attribute Category with the name "${minCategory.name}" in organization ${orgId}`;
        }

        const newAttributeCategory: AttributeCategory = {
            id: uuid.v1(),
            name: minCategory.name,
            attributes: minCategory.attributes ? minCategory.attributes : []
        }

        org.attributeCategories.push(newAttributeCategory);
        return [
            await org.save(),
            newAttributeCategory
        ];
    }

    async editAttributeCategory(orgId: string, categoryUpdates: AttributeCategoryUpdates): Promise<[OrganizationDoc, AttributeCategory]> {
        const org = await this.resolveOrganization(orgId);

        if (categoryUpdates.name && this.checkForDupes(categoryUpdates.name, org.attributeCategories.filter(cat => cat.id != categoryUpdates.id))) {
            throw `Already an Attribute Category with the name "${categoryUpdates.name}" in organization ${orgId}`;
        }

        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryUpdates.id);
        if (categoryIndex >= 0) {
            for (const prop in categoryUpdates) {
                org.attributeCategories[categoryIndex][prop] = categoryUpdates[prop];
            }
            org.markModified('attributeCategories');
            return [
                await org.save(),
                org.attributeCategories[categoryIndex]
            ]
        }

        throw `Unknown Attribute Category ${categoryUpdates.id} in organization ${orgId}`;
    }

    async removeAttributeCategory(orgId: string, categoryId: string): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            return this.transaction(async (session) => {
                for (let i = org.attributeCategories[categoryIndex].attributes.length - 1; i >= 0; i--) {
                    // Removing the attribute from the attribute category itself.
                    // Removing the attribute from users.
                    await this.removeAttribute(org, categoryId, org.attributeCategories[categoryIndex].attributes[i].id, session);
                }

                // Remove the attribute category from the organization.
                org.attributeCategories.splice(categoryIndex, 1);
                org.markModified('attributeCategories');
                return await org.save({ session });
            })
        }

        throw `Unknown Attribute Category ${categoryId} in organization ${orgId}`;
    }

    async addAttributeToOrganization(orgId: string, categoryId: string, minAttribute: MinAttribute): Promise<[OrganizationDoc, Attribute]> {
        const org = await this.resolveOrganization(orgId);
        const newAttribute: Attribute = {
            id: uuid.v1(),
            name: minAttribute.name
        }

        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            if (this.checkForDupes(newAttribute.name, org.attributeCategories[categoryIndex].attributes)) {
                throw `Already an Attribute with the name "${newAttribute.name}" in Attribute Category "${org.attributeCategories[categoryIndex].name}" in Organization ${orgId}`;
            }

            org.attributeCategories[categoryIndex].attributes.push(newAttribute);
            org.markModified('attributeCategories');
            return [
                await org.save(),
                newAttribute
            ]
        }

        throw `Unknown Attribute Category ${categoryId} in organization ${orgId}`;
    }

    async editAttribute(orgId: string, categoryId: string, attributeUpdates: AtLeast<Attribute, 'id'>): Promise<[OrganizationDoc, Attribute]> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            if (attributeUpdates.name && this.checkForDupes(attributeUpdates.name, org.attributeCategories[categoryIndex].attributes.filter(attr => attr.id != attributeUpdates.id))) {
                throw `Already an Attribute with the name "${attributeUpdates.name}" in Attribute Category "${org.attributeCategories[categoryIndex].name}" in Organization ${orgId}`;
            }

            const attributeIndex = org.attributeCategories[categoryIndex].attributes.findIndex(attr => attr.id == attributeUpdates.id);
            if (attributeIndex >= 0) {
                for (const prop in attributeUpdates) {
                    org.attributeCategories[categoryIndex].attributes[attributeIndex][prop] = attributeUpdates[prop];
                }
                org.markModified('attributeCategories');
                return [
                    await org.save(),
                    org.attributeCategories[categoryIndex].attributes[attributeIndex]
                ]
            }

            throw `Unknown Attribute ${attributeUpdates.id} in Attribute Category ${categoryId} in organization ${orgId}`;
        }

        throw `Unknown Attribute Category ${categoryId} in organization ${orgId}`;
    }

    // TODO: Should we just take a list of attributeIds and not worry about categoryId since we have to look through
    // all the categories anyway to find the index (given ID)?
    async removeAttribute(orgId: string | OrganizationDoc, categoryId: string, attributeId: string, session?: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            const attributeIndex = org.attributeCategories[categoryIndex].attributes.findIndex(attr => attr.id == attributeId);

            // Remove the Attribute from the Attribute Category list.
            if (attributeIndex >= 0) {
                org.attributeCategories[categoryIndex].attributes.splice(attributeIndex, 1);
                org.markModified('attributeCategories');

                // Create a map from user ID => attribute index (in the list of a user's attributes)
                // When we get the UserDoc[] from the DB, we'll remove the attribute at the index.
                const usersToSave: Map<string, number> = new Map<string, number>();
                (org.members as UserModel[]).forEach(member => {
                    let attrIndex = member.organizations[org.id].attributes.findIndex(attr => attr.id == attributeId);
                    if (attrIndex >= 0) {
                        usersToSave.set(member.id, attrIndex);
                    }
                });

                // Retrieve the users from the DB by ID, and update their attributeIds list.
                const userIds = Array.from(usersToSave.keys());
                if (session) {
                    for (const user of await this.getUsersByIds(userIds)) {
                        user.organizations[org.id].attributes.splice(usersToSave[user.id], 1);
                        user.markModified('organizations');
                        await user.save({ session });
                    }
                    return await org.save({ session });
                } else {
                    return this.transaction(async (newSession) => {
                        for (const user of await this.getUsersByIds(userIds)) {
                            user.organizations[org.id].attributes.splice(usersToSave[user.id], 1);
                            user.markModified('organizations');
                            await user.save({ session: newSession });
                        }
                        return await org.save({ session: newSession });
                    })
                }
            }

            throw `Unknown Attribute ${attributeId} in Attribute Category ${categoryId} in organization ${orgId}`;
        }

        throw `Unknown Attribute Category ${categoryId} in organization ${orgId}`;
    }

    async addAttributesToUser(orgId: string, userId: string | UserDoc, attributes: AttributeHandle[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        }

        // Validate attributes exist
        const org = await this.resolveOrganization(orgId);
        for (const attribute of attributes) {
            let foundAttribute = false;
            const category = org.attributeCategories.find(category => category.id == attribute.categoryId);
            if (category) {
                foundAttribute = category.attributes.some(attr => attr.id == attribute.id);
            }

            if (!foundAttribute) {
                throw `Attribute ${attribute.id} does not exist in organization ${orgId}.`
            }
        }

        await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
            const attributeSet = new Set(orgConfig.attributes);
            attributes.forEach(attr => attributeSet.add(attr));
            return Object.assign({}, orgConfig, { attributeIds: Array.from(attributeSet.values()) });
        })

        return await user.save();
    }

    async removeAttributesFromUser(orgId: string, userId: string | UserDoc, attributes: AttributeHandle[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        }

        await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
            const attributeSet = new Set(orgConfig.attributes);
            attributes.forEach(attr => attributeSet.delete(attr));
            return Object.assign({}, orgConfig, { attributeIds: Array.from(attributeSet.values()) });
        })

        return await user.save();
    }

    // Tags
    async addTagCategoryToOrganization(orgId: string, minCategory: MinTagCategory): Promise<[OrganizationDoc, TagCategory]> {
        const org = await this.resolveOrganization(orgId);

        if (this.checkForDupes(minCategory.name, org.tagCategories)) {
            throw `Already an Tag Category with the name "${minCategory.name}" in organization ${orgId}`;
        }

        const newTagCategory: TagCategory = {
            id: uuid.v1(),
            name: minCategory.name,
            tags: minCategory.tags ? minCategory.tags : []
        }

        org.tagCategories.push(newTagCategory);
        return [
            await org.save(),
            newTagCategory
        ];
    }

    async editTagCategory(orgId: string, categoryUpdates: TagCategoryUpdates): Promise<[OrganizationDoc, TagCategory]> {
        const org = await this.resolveOrganization(orgId);

        if (categoryUpdates.name && this.checkForDupes(categoryUpdates.name, org.tagCategories.filter(cat => cat.id != categoryUpdates.id))) {
            throw `Already a Tag Category with the name "${categoryUpdates.name}" in organization ${orgId}`;
        }

        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryUpdates.id);
        if (categoryIndex >= 0) {
            for (const prop in categoryUpdates) {
                org.tagCategories[categoryIndex][prop] = categoryUpdates[prop];
            }
            org.markModified('tagCategories');
            return [
                await org.save(),
                org.tagCategories[categoryIndex]
            ]
        }

        throw `Unknown Tag Category ${categoryUpdates.id} in organization ${orgId}`;
    }

    async removeTagCategory(orgId: string, categoryId: string): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            return this.transaction(async (session) => {
                for (let i = org.tagCategories[categoryIndex].tags.length - 1; i >= 0; i--) {
                    // Removing the tag from the tag category itself.
                    // Removing the tag from help requests.
                    // TODO: Do I need to get returned org here?
                    await this.removeTag(org, categoryId, org.tagCategories[categoryIndex].tags[i].id, session);
                }

                // Remove the attribute category from the organization.
                org.tagCategories.splice(categoryIndex, 1);
                org.markModified('tagCategories');
                return await org.save({ session });
            })
        }

        throw `Unknown Tag Category ${categoryId} in organization ${orgId}`;
    }

    async addTagToOrganization(orgId: string, categoryId: string, minTag: MinTag): Promise<[OrganizationDoc, Tag]> {
        const org = await this.resolveOrganization(orgId)
        const newTag: Tag = {
            id: uuid.v1(),
            name: minTag.name
        }

        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            if (this.checkForDupes(newTag.name, org.tagCategories[categoryIndex].tags)) {
                throw `Already a Tag with the name "${newTag.name}" in Tag Category "${org.tagCategories[categoryIndex].name}" in Organization ${orgId}`;
            }

            org.tagCategories[categoryIndex].tags.push(newTag);
            org.markModified('tagCategories');
            return [
                await org.save(),
                newTag
            ]
        }

        throw `Unknown Tag Category ${categoryId} in organization ${orgId}`;
    }

    async editTag(orgId: string, categoryId: string, tagUpdates: AtLeast<Tag, 'id'>): Promise<[OrganizationDoc, Tag]> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            if (this.checkForDupes(tagUpdates.name, org.tagCategories[categoryIndex].tags.filter(tag => tag.id != tagUpdates.id))) {
                throw `Already a Tag with the name "${tagUpdates.name}" in Tag Category "${org.tagCategories[categoryIndex].name}" in Organization ${orgId}`;
            }

            const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == tagUpdates.id);
            if (tagIndex >= 0) {
                for (const prop in tagUpdates) {
                    org.tagCategories[categoryIndex].tags[tagIndex][prop] = tagUpdates[prop];
                }
                org.markModified('tagCategories');
                return [
                    await org.save(),
                    org.tagCategories[categoryIndex].tags[tagIndex]
                ]
            }

            throw `Unknown Tag ${tagUpdates.id} in Tag Category ${categoryId} in organization ${orgId}`;
        }

        throw `Unknown Tag Category ${categoryId} in organization ${orgId}`;
    }

    async removeTag(orgId: string | OrganizationDoc, categoryId: string, tagId: string, session?: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == tagId);

            // Remove the Tag from the Tag Category list.
            if (tagIndex >= 0) {
                org.tagCategories[categoryIndex].tags.splice(tagIndex, 1);
                org.markModified('tagCategories');

                // Remove the tag id from Help Requests that currently have this tag.
                // TODO: check working as expected.
                const requests: HelpRequestDoc[] = await this.getRequests({ orgId: org.id }).where({ tagIds: tagId });
                for (let i = 0; i < requests.length; i++) {
                    let tagIndex = requests[i].tagIds.findIndex(id => id == tagId);
                    if (tagIndex >= 0) {
                        // Remove the tag from the help request's list of tags, and add to the list of requests to save.
                        requests[i].tagIds.splice(tagIndex, 1);
                        // TODO: needed?
                        requests[i].markModified('tagIds');
                    }
                }

                if (session) {
                    // TODO: return all objects to be saved (requests and org).
                    // This would introduce different return types based on the path...
                    // return [org, requests]
                    for (const request of requests) {
                        await request.save({ session });
                    }

                    return await org.save({ session });
                } else {
                    return this.transaction(async (newSession) => {
                        for (const request of requests) {
                            await request.save({ session: newSession });
                        }
                        return await org.save({ session: newSession });
                    })
                }
            }

            throw `Unknown Tag ${tagId} in Tag Category ${categoryId} in organization ${orgId}`;
        }

        throw `Unknown Tag Category ${categoryId} in organization ${orgId}`;
    }

    checkForDupes(name: string, collection: AtLeast<any, 'name'>[]) {
        return collection.some(item => this.namesAreEqual(name, item.name));
    }

    namesAreEqual(first: string, second: string): boolean {
        // Case insensitive matching for now.
        return first.toLowerCase() == second.toLowerCase();
    }

    // Requests

    async createRequest(minhHelpRequest: MinHelpRequest, orgId: string, dispatcherId: string): Promise<HelpRequestDoc> {
        const req = new this.requests(minhHelpRequest);
        
        req.orgId = orgId;
        req.dispatcherId = dispatcherId;
        req.assignedResponderIds ||= [];

        req.status ||= req.assignedResponderIds.length 
            ? req.respondersNeeded && req.assignedResponderIds.length < req.respondersNeeded
                ? RequestStatus.PartiallyAssigned
                : RequestStatus.Ready
            : RequestStatus.Unassigned;

        const org = await this.resolveOrganization(orgId)

        const timezone = timespace.getFuzzyLocalTimeFromPoint(Date.now(), [ req.location.longitude, req.location.latitude ])

        const reqTime = timezone
            .hours(12)
            .minutes(1)
            .seconds(1)
            .milliseconds(1);

        const lastReqTime = moment(org.lastDayTimestamp)
            .hours(12)
            .minutes(1)
            .seconds(1)
            .milliseconds(1);

        const firstReqForToday = reqTime > lastReqTime;

        return this.transaction(async (session) => {
            org.lastRequestId++;

            if (firstReqForToday) {
                org.lastDayTimestamp = reqTime.toISOString()
            }

            const displayId = `${org.lastRequestId}-${reqTime.format('MMDD')}`
            req.displayId = displayId;

            await org.save({ session });

            return await req.save({ session })
        })
    }

    async getRequest(query: Partial<HelpRequestModel>): Promise<HelpRequestDoc> {
        return await this.requests.findOne(query);
    }

    async editRequest(helpRequest: string | HelpRequestDoc, requestUpdates: AtLeast<HelpRequest, 'id'>) {
        const req = await this.resolveRequest(helpRequest);

        for (const prop in requestUpdates) {
            // field specific work if we need it in the future
            req[prop] = requestUpdates[prop]
        }

        return await req.save()
    }

    getRequests(query: FilterQuery<HelpRequestModel>) {
        return this.requests.find(query);
    }

    async getSpecificRequests(orgId: string, requestIds: string[]): Promise<HelpRequestDoc[]> {
        return this.getRequests({ orgId })
            .where({ _id: { $in: requestIds } });
    }

    async getAllRequests(orgId: string): Promise<HelpRequestDoc[]> {
        return this.getRequests({ orgId })
            .sort({ createdAt: 'asc' });
    }

    async sendMessageToReq(user: UserDoc, helpRequest: HelpRequestDoc, message: string): Promise<HelpRequestDoc> {
        return this.transaction(async (session) => {
            this.updateHelpRequestChat(helpRequest, (possibleChat?: Chat) => {
                // create chat if this is the first message
                const chat = possibleChat|| {
                    id: `req:${helpRequest.id}`,
                    messages: [],
                    userReceipts: {},
                    lastMessageId: 0
                };

                const chatMsg : ChatMessage = {
                    message, 
                    userId: user.id,
                    timestamp: Date.now(),
                    id: ++chat.lastMessageId
                }

                chat.messages.push(chatMsg);
                console.log(chat.messages.length)

                chat.userReceipts[user.id] = chat.lastMessageId;
                
                return chat
            })
                
            return await helpRequest.save({ session });
        })
    }

    async updateRequestChatRecepit(helpRequest: HelpRequestDoc, userId: string, lastMessageId: number): Promise<HelpRequestDoc> {
        const prevLastMessageId = helpRequest.chat.userReceipts[userId];
        
        if (!prevLastMessageId || (prevLastMessageId < lastMessageId)) {
            this.updateHelpRequestChat(helpRequest, (chat: Chat) => {
                chat.userReceipts[userId] = lastMessageId;
                return chat;
            })
        }

        return await helpRequest.save()
    }

    async assignRequest(request: string | HelpRequestDoc, to: string[]) {
        request = await this.resolveRequest(request);

        request.assignments ||= [];

        request.assignments.push({
            responderIds: to,
            timestamp: new Date().getTime()
        });

        const updatedRequest = await request.save();

        return updatedRequest;
    }

    async confirmRequestAssignment(requestId: string | HelpRequestDoc, userId: string) {
        const request = await this.resolveRequest(requestId);

        if (!request.assignedResponderIds.includes(userId)) {
            request.assignedResponderIds.push(userId);
        }

        const idx = request.declinedResponderIds.indexOf(userId)

        if (idx != -1) {
            request.declinedResponderIds.splice(idx, 1)
        }

        if (request.status == RequestStatus.Unassigned || request.status == RequestStatus.PartiallyAssigned) {
            request.status = request.respondersNeeded > request.assignedResponderIds.length
                ? RequestStatus.PartiallyAssigned
                : RequestStatus.Ready;
        }

        return await request.save()
    }

    async declineRequestAssignment(requestId: string | HelpRequestDoc, userId: string) {
        const request = await this.resolveRequest(requestId);

        if (!request.declinedResponderIds.includes(userId)) {
            request.declinedResponderIds.push(userId);
        }

        const idx = request.assignedResponderIds.indexOf(userId)

        if (idx != -1) {
            request.assignedResponderIds.splice(idx, 1)
        }

        if (request.status == RequestStatus.Ready || request.status == RequestStatus.PartiallyAssigned) {
            request.status = request.assignedResponderIds.length
                ? RequestStatus.PartiallyAssigned
                : RequestStatus.Unassigned;
        }

        return await request.save()
    }

    async removeUserFromRequest(userId: string, requestId: string): Promise<HelpRequestDoc> {
        const request = await this.resolveRequest(requestId);
        const idx = request.assignedResponderIds.indexOf(userId);

        if (idx != -1) {
            request.assignedResponderIds.splice(idx, 1);
        }

        return await request.save();
    }

    // HELPERS

    findByIds<M extends Model<any>, D=DocFromModel<M>>(model: M, ids: string[]): Query<D[], D> {
        return model.find({ _id: { $in: ids } });
    }

    findById<M extends Model<any>, D=DocFromModel<M>>(model: M, id: string): Query<D, D> {
        return model.findOne({ _id: id });
    }

    /**
     * Note you CANNOT use Promise.all() inside of ops...must handle each async db action sequentially
     * ie. (https://medium.com/@alkor_shikyaro/transactions-and-promises-in-node-js-ca5a3aeb6b74)
     */
    async transaction<T extends (session: ClientSession) => Promise<any>>(ops: T, session?: ClientSession): Promise<ReturnType<T>> {
        // allow individual methods to honor a transaction they are already in without having to change their
        // call structure
        if (session) {
            return await ops(session);
        }
        
        let retVal;

        await this.db.get().transaction(async (freshSession) => {
            retVal = await ops(freshSession);
        });


        return retVal;
    }

    async bulkUpsert<T>(model: Model<T>, docs: Document<T>[]) {
        const bulkOps = docs.map(doc => ({
            updateOne: {
                filter: { _id: doc._id },
                update: doc.toJSON(),
                upsert: true,
            }
        }))

        await model.bulkWrite(bulkOps);
    }

    async bulkDelete<T>(model: Model<T>, docs: Document<T>[]) {
        const bulkOps = docs.map(doc => ({
            deleteOne: {
                filter: { _id: doc._id },
            }
        }))

        await model.bulkWrite(bulkOps);
    }

    async resolveOrganization(orgId: string | OrganizationDoc) {
        const org = typeof orgId === 'string' 
            ? await this.getOrganization({ _id: orgId })
            : orgId;

        if (!org) {
            throw `Unknown organization`
        }

        return org;
    }

    async resolveUser(userId: string | UserDoc) {
        const user = typeof userId === 'string'
            ? await this.getUser({ _id: userId })
            : userId;

        if (!user) {
            throw `Unknown user`
        }

        return user;
    }

    async resolveRequest(requestId: string | HelpRequestDoc) {
        const user = typeof requestId === 'string'
            ? await this.getRequest({ _id: requestId })
            : requestId;

        if (!user) {
            throw `Unknown request`
        }

        return user;
    }

    //@Every('5 minutes', { name: `Repopulating` })
    async rePopulateDb() {
        try {
            const oldUsers = await this.getUsers({});
            const oldRequests = await this.getRequests({});
            const oldOrgs = await this.getOrganizations({});

            console.log('deleting old users')
            await this.bulkDelete(this.users, oldUsers);

            console.log('deleting old requests')
            await this.bulkDelete(this.requests, oldRequests);

            console.log('deleting old organizations')
            await this.bulkDelete(this.orgs, oldOrgs);

            console.log('creating users/org')
            let user1 = await this.createUser({ 
                email: 'Charlie@test.com', 
                password: 'Test', 
                displayColor: "#25db00",
                name: "Chuck LePartay",
                race: "nunya",
                phone: "8045166822",
                skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth ]
            });

            let [ org, admin1 ] = await this.createOrganization({
                name: 'Test Org'
            }, user1.id);

            admin1 = await this.addUserRoles(org.id, admin1, [ UserRole.Dispatcher, UserRole.Responder ]);

            let user2 = await this.createUser({ 
                email: 'Nadav@test.com', 
                password: 'Test',
                name: 'Nadav Sorrynotsry',
                skills: [ RequestSkill.French, RequestSkill.ConflictResolution ]
            });

            let user3 = await this.createUser({ 
                email: 'Cosette@test.com', 
                password: 'Test',
                name: 'Cosette Ayyayy',
                skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth, RequestSkill.RestorativeJustice, RequestSkill.DomesticViolence ]
            });

            let user4 = await this.createUser({ 
                email: 'tevn@test.com', 
                password: 'Test',
                name: 'Tevy Tev',
                skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth, RequestSkill.RestorativeJustice, RequestSkill.DomesticViolence ]
            });

            let userAdmin = await this.createUser({ 
                email: 'admin@test.com', 
                password: 'Test',
                name: 'Adminess Hater',
                skills: []
            });

            let userDispatcher = await this.createUser({ 
                email: 'dispatcher@test.com', 
                password: 'Test',
                name: 'Dee Patcher',
                skills: []
            });

            let userResponder = await this.createUser({ 
                email: 'responder@test.com', 
                password: 'Test',
                name: 'Reece Ponder II',
                skills: []
            });

            [ org, user2 ] = await this.addUserToOrganization(org, user2, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], [], []);
            [ org, user3 ] = await this.addUserToOrganization(org, user3, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], [], []);
            [ org, user4 ] = await this.addUserToOrganization(org, user4, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], [], []);
            [ org, userAdmin ] = await this.addUserToOrganization(org, userAdmin, [ UserRole.Admin ], [], []);
            [ org, userDispatcher ] = await this.addUserToOrganization(org, userDispatcher, [ UserRole.Dispatcher ], [], []);
            [ org, userResponder ] = await this.addUserToOrganization(org, userResponder, [ UserRole.Responder ], [], []);

            console.log('creating new user...');
            let user5 = await this.createUser({ 
                email: 'Tevn2@test.com', 
                password: 'Test',
                name: 'Tevy Tev2',
                skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth, RequestSkill.RestorativeJustice, RequestSkill.DomesticViolence ]
            });

            console.log('creating second org...');
            let [ org2, admin2 ] = await this.createOrganization({
                name: 'Test Org 2'
            }, user5.id);

            let role1: MinRole = {
                name: 'first role',
                permissions: [
                    PatchPermissions.EditOrgSettings,
                    PatchPermissions.RoleAdmin,
                    PatchPermissions.AttributeAdmin,
                    PatchPermissions.TagAdmin,
                    PatchPermissions.AssignRoles,
                    PatchPermissions.AssignAttributes,
                    PatchPermissions.ChatAdmin,
                    PatchPermissions.ShiftAdmin,
                    PatchPermissions.RequestAdmin
                ]
            };

            console.log('adding new role to org2...');
            [org2, role1] = await this.addRoleToOrganization(role1, org2.id);

            console.log('adding new role to user...');
            user5 = await this.addRolesToUser(org2.id, user5.id, [role1.id]);

            console.log('adding new Attribute category...');
            const testAttrCat1: MinAttributeCategory = {
                name: 'Attribute Category 1 - repopulateDB'
            }

            const testAttrCat2: MinAttributeCategory = {
                name: 'Attribute Category 2 - repopulateDB'
            }

            let attrCat1 = null;
            let attrCat2 = null;
            [org2, attrCat1] = await this.addAttributeCategoryToOrganization(org2.id, testAttrCat1);
            [org2, attrCat2] = await this.addAttributeCategoryToOrganization(org2.id, testAttrCat2);

            console.log('adding new Attribute...');
            const testAttr1: Attribute = {
                id: uuid.v1(),
                name: 'Attribute 1 - repopulateDb'
            }

            const testAttr2: Attribute = {
                id: uuid.v1(),
                name: 'Attribute 2 - repopulateDb'
            }

            let attr1 = null;
            let attr2 = null;
            [org2, attr1] = await this.addAttributeToOrganization(org2.id, attrCat1.id, testAttr1);
            [org2, attr2] = await this.addAttributeToOrganization(org2.id, attrCat2.id, testAttr2);

            console.log('Assigning attributes to user...');
            user5 = await this.addAttributesToUser(org2.id, user5.id, [attr1.id, attr2.id]);

            console.log('Removing attribute from user...');
            user5 = await this.removeAttributesFromUser(org2.id, user5.id, [attr2.id]);

            const minRequests: MinHelpRequest[] = [
                {
                    skills: [RequestSkill.CPR, RequestSkill.ConflictResolution],
                    type: [RequestType.ConflictResolution, RequestType.DomesticDisturbance],
                    location: {
                        latitude: 40.69776419999999,
                        longitude: -73.9303333,
                        address: "960 Willoughby Avenue, Brooklyn, NY, USA"
                    },
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                    respondersNeeded: 2
                },
                {
                    skills: [RequestSkill.SubstanceUseTreatment],
                    type: [RequestType.ConflictResolution, RequestType.FirstAid, RequestType.SubstanceCounseling],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                    respondersNeeded: 1
                },
                {
                    skills: [RequestSkill.MentalHealth, RequestSkill.SubstanceUseTreatment, RequestSkill.FirstAid, RequestSkill.CPR],
                    type: [RequestType.ConflictResolution],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                    respondersNeeded: 4,
                },
                {
                    skills: [RequestSkill.French, RequestSkill.TraumaCounseling, RequestSkill.SubstanceUseTreatment],
                    type: [RequestType.Counseling],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                    respondersNeeded: 2,
                    assignedResponderIds: [user1.id, user2.id],
                    status: RequestStatus.Done
                }
            ];

            const fullReqs: HelpRequestDoc[] = [];
            
            console.log('creating requests')
            for (const req of minRequests) {
                fullReqs.push(await this.createRequest(req, org.id, admin1.id))
            }

            fullReqs[0] = await this.assignRequest(fullReqs[0], [user1.id, user2.id, user3.id]);
            fullReqs[1] = await this.assignRequest(fullReqs[1], [user2.id, user3.id]);
            fullReqs[2] = await this.assignRequest(fullReqs[2], [user1.id, user2.id]);

            fullReqs[0] = await this.confirmRequestAssignment(fullReqs[0], user1.id);
            fullReqs[0] = await this.declineRequestAssignment(fullReqs[0], user3.id);
            fullReqs[1] = await this.confirmRequestAssignment(fullReqs[1], user3.id);
            fullReqs[2] = await this.declineRequestAssignment(fullReqs[2], user1.id);
            
            let reqWithMessage = await this.sendMessageToReq(user1, fullReqs[0], 'Message one...blah blah blah...blah blah blah blah blah ')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Two!')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Three!...blah blah blah')

            console.log('finished populating')
        } catch (e) {
            console.error(e)
        }
    }

    // @Every('30 seconds', { name: `E2E Test` })
    // async test() {
    //     try {
    //         let user = await this.getUser({ email: 'Test@test.com' });
    //         const helpReq = await this.getRequest({ _id: '6153999a517b7c7d53411e46' });

    //         console.log(await this.sendMessageToReq(user, helpReq, 'testing testing 123'));
            // let user = await this.createUser({ email: 'Test@test.com', password: 'Test' });

            // let [ org, admin ] = await this.createOrganization({
            //     name: 'Foo Org'
            // }, user.id);

            // admin = await this.addUserRoles(org.id, admin, [ UserRole.Dispatcher, UserRole.Responder ]);

            // admin = await this.addUserRoles(org.id, admin, [2, 3, 4, 5])
            // admin = await this.removeUserRoles(org.id, admin, [2, 3])

            // console.log(inspect(admin.toObject(), null, 4));
            // console.log(inspect((await this.getOrganization({ _id: org.id })).toObject(), null, 4));

            // [ org, admin ] = await this.removeUserFromOrganization(org, admin);

            // console.log(inspect([org, admin], null, 5));

            // console.log((await this.getUser({ _id: user.id })).toJSON());
            // console.log((await this.getOrganization({ _id: org.id })).toJSON())

            // await Promise.all([
            //     admin.delete(),
            //     org.delete()
            // ])
    //     } catch (e) {
    //         console.error(e)
    //     }
    // }
}

