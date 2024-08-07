import { AdminEditableUser, Attribute, AttributeCategory, AttributeCategoryUpdates, AttributesMap, CategorizedItem, Chat, ChatMessage, DefaultRoleIds, DefaultRoles, DefaultAttributeCategories, DefaultTagCategories, HelpRequest, Me, MinAttribute, MinAttributeCategory, MinHelpRequest, MinRole, MinTag, MinTagCategory, MinUser, Organization, OrganizationMetadata, PatchEventType, PendingUser, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestType, Role, Tag, TagCategory, TagCategoryUpdates, User, UserOrgConfig, CategorizedItemUpdates, RequestUpdates, DynamicConfig } from "common/models";
import { UserDoc, UserModel } from "../models/user";
import { OrganizationDoc, OrganizationModel } from "../models/organization";
import { getSchema } from "@tsed/mongoose";
import Mongoose, { ClientSession, Document, FilterQuery, Model, Query } from "mongoose";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import randomColor from 'randomcolor';
import * as uuid from 'uuid';
import { AtLeast } from "common";
import { BadRequest } from "@tsed/exceptions";
import { resolveRequestStatus } from "common/utils/requestUtils";
import STRINGS from "common/strings";
import { AuthCodeModel } from "../models/authCode";
import { hash } from 'bcrypt';
import { applyUpdateToRequest } from "common/utils";
import { writeFile } from "fs/promises";
import { Collections } from "./dbConfig";
import { DynamicConfigDoc, DynamicConfigModel } from "../models/dynamicConfig";
import { Agenda, Every } from "@tsed/agenda";

type DocFromModel<T extends Model<any>> = T extends Model<infer Doc> ? Document & Doc : never;

export class DBManager { 

    static async fromConnectionString(mongoConnString: string, opts?: Mongoose.ConnectOptions) {
        const conn = await Mongoose.createConnection(mongoConnString, opts || {})

        const users = conn.model<UserModel>(UserModel.name, getSchema(UserModel), Collections.User)
        const orgs = conn.model<OrganizationModel>(OrganizationModel.name, getSchema(OrganizationModel), Collections.Organization)
        const requests = conn.model<HelpRequestModel>(HelpRequestModel.name, getSchema(HelpRequestModel), Collections.HelpRequest)
        const authCodes = conn.model<AuthCodeModel>(AuthCodeModel.name, getSchema(AuthCodeModel), Collections.AuthCode)
        const dynamicConfig = conn.model<DynamicConfigModel>(DynamicConfigModel.name, getSchema(DynamicConfigModel), Collections.DynamicConfig)

        return new DBManager(conn, users, orgs, requests, authCodes, dynamicConfig)
    }

    constructor(
        public connection: Mongoose.Connection,
        public users: Model<UserModel>,
        public orgs: Model<OrganizationModel>,
        public requests: Model<HelpRequestModel>,
        public authCodes: Model<AuthCodeModel>,
        public dynamicConfig: Model<DynamicConfigModel>
    ) { }

    async closeConnection() {
        await this.connection.close()
    }

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

        // mongo will return undefined if the object is empty
        if (!user.organizations) {
            user.organizations = {};
        }

        return user
    }

    removedUser(user: ProtectedUser): ProtectedUser {
        return { 
            id: user.id,
            name: user.name,
            // mongo will return undefined if the object is empty
            organizations: user.organizations || {},
            phone: '',
            email: '',
            displayColor: ''
        }
    }

    me(user: UserDoc): Me {
        const pubUser = user.toObject({ virtuals: true });

        // strip private fields off here so all other server side apis can have access to
        // them with the initial call to the db to check auth
        for (const key in UserModel.systemProperties) {
            pubUser[key] = undefined
        }

        // mongo will return undefined if the object is empty
        if (!user.organizations) {
            user.organizations = {};
        }

        return pubUser;
    }

    async getDynamicConfig(): Promise<DynamicConfigDoc> {
        // singleton
        return await this.dynamicConfig.findOne()
    }

    /**
     * Should only be called by infra/cli not controllers
     * 
     */
    async upsertDynamicConfig(update: Partial<DynamicConfig>) {
        console.log('getting existing config')
        let config = await this.getDynamicConfig()

        if (!config) {

            // create a new one using the update
            config = new this.dynamicConfig(update)
        }
        
        console.log('saving update')
        for (const prop in update) {
            config[prop] = update[prop]
            // console.log('markModified:', prop)
            // config.markModified(prop);
        }

        console.log(config.appVersion)
        console.log(config)

        return config.save()
    }

    async protectedOrganization(org: OrganizationDoc): Promise<Organization> {
        const membersPopulated = org.populated('members');
        const removedMembersPopulated = org.populated('removedMembers');

        if (!membersPopulated) {
            // org = await org.populate({ path: 'members', select: this.privateUserProps() }).execPopulate();
            org = await org.populate({ path: 'members', select: this.privateUserProps() });
        }

        if (!removedMembersPopulated) {
            // org = await org.populate({ path: 'removedMembers', select: this.privateUserProps() }).execPopulate();
            org = await org.populate({ path: 'removedMembers', select: this.privateUserProps() });
        }

        const jsonOrg = org.toJSON() as Organization;

        jsonOrg.members = jsonOrg.members.map(this.protectedUser);
        jsonOrg.removedMembers = jsonOrg.removedMembers.map(this.protectedUser).map(this.removedUser);

        return jsonOrg;
    }

    // TODO: need special type to see full user models on this that aren't a ref
    async fullOrganization(orgId: string | OrganizationDoc) {
        const org = await this.resolveOrganization(orgId);
        // TODO: I think this might be redundant with getOrganization's populate?
        // const populatedOrg = (await org.populate({ path: 'members' }).execPopulate())
        const populatedOrg = await org.populate({ path: 'members' })

        return populatedOrg;
    }

    fullHelpRequest(helpRequest: HelpRequestDoc): HelpRequest {
        return helpRequest.toObject({ virtuals: true }) as any as HelpRequest;
    }

    async createUser(user: Partial<UserModel>): Promise<UserDoc> {
        user.auth_etag = user.auth_etag || uuid.v1();
        user.displayColor = user.displayColor || randomColor({
            hue: '#DB0000'
        });

        user.password = await hash(user.password, 10);

        const newUser = new this.users(user)
        user.organizations = {};

        return await newUser.save();
    }

    async deleteUser(userId: string | UserDoc, session?: ClientSession) {
        return this.transaction(async (session) => {
            const user = await this.resolveUser(userId);

            // delete the user from all orgs they are currently a part of
            const orgIds = Object.keys(user.organizations);

            for (const orgId of orgIds) {
                // skip orgs user was previously removed from
                if (user.organizations[orgId]) {
                    await this.removeUserFromOrganization(orgId, user, true, session)
                }
            }

            // remove user from the removedUsers of any org they were previously removed from
            const previousOrgs = await this.orgs.find({
                removedMembers: {
                    $elemMatch: {
                        $eq: user.id
                    }
                }
            });

            for (const org of previousOrgs) {
                const removedIdx = org.removedMembers.indexOf(user.id);
            
                if (removedIdx != -1) {
                    org.removedMembers.splice(removedIdx, 1);
                    await org.save({ session })
                }
            }

            // delete any authCodes associated w/ user
            const authCodes = await this.authCodes.find({ userId: user.id });
            await this.bulkDelete(this.authCodes, authCodes, session)

            // delete the user from the global space
            await user.delete({ session })

        }, session)
    }

    async acceptInviteToOrg(orgId: string | OrganizationDoc, pendingId: string, existingUser: UserDoc) {
        const org = await this.resolveOrganization(orgId);
        const idx = org?.pendingUsers?.findIndex(u => u.pendingId == pendingId);

        if (idx != -1) {

            let alreadyInTagetOrg = false;
            let numOrgs = 0;

            for (const orgId in existingUser.organizations) {
                const inOrg = !!existingUser.organizations[orgId];

                if (inOrg) {
                    numOrgs++;

                    if (orgId == org.id) {
                        alreadyInTagetOrg = true;
                    }
                }
            }

            if (alreadyInTagetOrg) {
                throw new BadRequest(STRINGS.ACCOUNT.alreadyInOrg(org.name))
            } else if (numOrgs) {
                // TODO: remove when we have ui for being able to switch between orgs 
                // and made sure the ui handles it + backend sign up functions
                throw new BadRequest(STRINGS.ACCOUNT.errorMessages.onlyOneOrg);
            }

            const pendingUser = org.pendingUsers[idx];
            
            org.pendingUsers.splice(idx, 1);

            return await this.addUserToOrganization(org, existingUser, pendingUser.roleIds, pendingUser.attributes);
        } else {
            throw new BadRequest(STRINGS.ACCOUNT.inviteNotFound(existingUser.email, org.name))
        }
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
                    // skills: pendingUser.skills, 
                    email: pendingUser.email, 
                    phone: pendingUser.phone 
                }
            ));

            org.pendingUsers.splice(idx, 1);

            return await this.addUserToOrganization(org, newUser, pendingUser.roleIds, pendingUser.attributes);
        } else {
            throw new BadRequest(STRINGS.ACCOUNT.inviteNotFound(user.email, org.name))
        }
    }

    orgRequestPrefixFromName(name: string) {
        const parts = name.split(' ');

        let slug = ''

        if (parts.length == 1) {
            const fullName = parts[0];

            slug = fullName.length <= 6 
                ? fullName
                : fullName.slice(0, 4);
        } else if (parts.length == 2) {
            slug = `${parts[0].slice(0,2)}${parts[1].slice(0,2)}`
        } else {
            slug = parts.map(word => word[0]).join('')
        }

        return slug.toUpperCase()
    }

    async createOrganization(minOrg: Partial<OrganizationModel>, adminId: string) {
        return this.transaction(async (session) => {
            const newOrg: Partial<OrganizationModel> = { ...minOrg, 
                lastRequestId: 0, 
                // lastDayTimestamp: new Date().toISOString(),
                roleDefinitions: DefaultRoles,
                attributeCategories: DefaultAttributeCategories,
                tagCategories: DefaultTagCategories
            }

            newOrg.requestPrefix ||= this.orgRequestPrefixFromName(minOrg.name);

            const org = await (new this.orgs(newOrg)).save({ session })

            return await this.addUserToOrganization(org, adminId, [DefaultRoleIds.Admin], [], session)
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

    async getProtectedUser(query: Partial<UserModel>): Promise<Document<any, any, ProtectedUser>> {
        return await this.users.findOne(query).select(this.privateUserProps());
    }

    async getProtectedUsers(query: Partial<UserModel>): Promise<Document<any, any, ProtectedUser>[]> {
        return await this.users.find(query).select(this.privateUserProps());
    }

    async getOrganization(query: Partial<OrganizationModel>): Promise<OrganizationDoc> {
        return await this.orgs.findOne(query).populate('members')
    }

    async getOrganizations(query: Partial<OrganizationModel>): Promise<OrganizationDoc[]> {
        return await this.orgs.find(query).populate('members')
    }

    async updateHelpRequestChat(helpReq: string | HelpRequestDoc, cb: (chat?: Chat) => Chat) {
        const req = await this.resolveRequest(helpReq);
        
        const updatedChat = cb(req.chat);
        req.chat = updatedChat;

        req.markModified('chat');
    }

    async updateOrRemoveUsersOrgConfig(userOrId: string | UserDoc, orgId: string, cb: (orgConfig?: UserOrgConfig) => UserOrgConfig) {
        const user = await this.resolveUser(userOrId);
        const orgConfig = user.organizations[orgId];
        const newConfig = cb(orgConfig);

        if (!!newConfig) {
            user.organizations[orgId] = newConfig;
        } else {
            delete user.organizations[orgId]
        }

        user.markModified('organizations');
    }

    async updateUser(orgId: string, userOrId: string | UserDoc, protectedUser: Partial<AdminEditableUser>, updatedMe?: Partial<Omit<User, 'organizations'>>) {
        const user = await this.resolveUser(userOrId);

        for (const prop in protectedUser) {
            if (prop == 'roleIds') {
                user['organizations'][orgId]['roleIds'] = protectedUser[prop];
                user.markModified('organizations');
            } else if (prop == 'attributes') {
                user['organizations'][orgId]['attributes'] = protectedUser[prop];
                user.markModified('organizations');
            }
        }

        for (const prop in updatedMe) {
            user[prop] = updatedMe[prop];
        }

        return await user.save()
    }

    async updateUserPassword(userId: (string | UserDoc), password: string) {
        const user = await this.resolveUser(userId);
        user.password = await hash(password, 10);

        return await user.save()
    }

    async addUserToOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc, roleIds: string[], attributes: CategorizedItem[], session?: ClientSession) {
        const user = await this.resolveUser(userId);
        const org = await this.resolveOrganization(orgId);

        user.organizations ||= {};

        if (user.organizations[org.id]) {
            throw STRINGS.ACCOUNT.errorMessages.alreadyAMember;
        } else {
            await this.updateOrRemoveUsersOrgConfig(user, org.id, (_) => ({
                roleIds: roleIds,
                attributes: attributes,
                onDuty: false
            }))
        }

        // add the userId to the members array
        org.members.push(userId)

        // remove them from the removedUsers array if they were previously removed 
        const removedIdx = org.removedMembers.indexOf(user.id);
        
        if (removedIdx != -1) {
            org.removedMembers.splice(removedIdx, 1);
        }

        // save both in transaction
        return this.transaction(async (session) => {
            return [
                await org.save({ session }),
                await user.save({ session })
            ] as [ OrganizationDoc, UserDoc ];
        }, session)
    }

    async removeUserFromOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc, fullDelete: boolean, session?: ClientSession) {
        const user = await this.resolveUser(userId);

        const org = await this.resolveOrganization(orgId);

        // remove the entry in the organization map under the org key
        if (user.organizations && user.organizations[org.id]) {
            //effectively deleting
            await this.updateOrRemoveUsersOrgConfig(user, org.id, (_) => null)
        } 

        // remove the userId from the members array
        org.members.splice(org.members.findIndex((m) => {
            if (typeof m === 'string') {
                return m === userId
            } else {
                return m.id === userId
            }
        }), 1)

        // if just removing the user from the org but not deleting 
        // their account, keep them in the deleted users of that org
        // so their name etc. is still viewable in historical data
        if (!fullDelete) {
            org.removedMembers ||= []

            if (!org.removedMembers.includes(userId)) {
                org.removedMembers.push(userId);
            }
        }

        // save both
        return this.transaction(async (session) => {
            return [
                await org.save({ session }),
                await user.save({ session })
            ] as [ OrganizationDoc, UserDoc ];
        }, session)
    }



    async addPendingUserToOrg(orgId: string | OrganizationDoc, pendingUser: PendingUser) {
        const org = await this.resolveOrganization(orgId);

        const existingUserIdx = org.pendingUsers.findIndex((user) => user.email == pendingUser.email);

        // make sure only latest invite is honored
        if (existingUserIdx != -1) {
            org.pendingUsers.splice(existingUserIdx, 1)
        }

        // TODO: we should put an orgInvites field or something on the user (if they already exist)
        // so you can know you have invites without having to do a huge search across every org
        // in the db...then this would update with the user (if they exist) in a transaction
        org.pendingUsers.push(pendingUser)

        await org.save()
    }

    async editOrgMetadata(orgId: string, orgUpdates: Partial<Pick<OrganizationMetadata, 'name' | 'requestPrefix'>>): Promise<OrganizationDoc> {
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
            // org.markModified('roleDefinitions');
            return await org.save();
        }

        throw STRINGS.SETTINGS.errorMessages.roleNotInOrg(roleUpdates.id, orgId);
    }

    async addRoleToOrganization(minRole: MinRole, orgId: string): Promise<[OrganizationDoc, Role]> {
        const org = await this.resolveOrganization(orgId)
        const newRole: Role = {
            id: uuid.v1(),
            name: '',
            permissionGroups: []
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

    async removeRolesFromOrganization(orgId: string, roleIds: string[]): Promise<{ 
        updatedOrg: OrganizationDoc,
        updatedRequests: HelpRequestDoc[],
        updatedUsers: UserDoc[]
    }> {
        const org = await this.resolveOrganization(orgId);

        return this.transaction(async (session) => {
            // Remove the role ID from users currently assigned this role.
            const updatedUsers: UserDoc[] = []

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
                    updatedUsers.push(await user.save({ session }));
                }
            }

            // replace the role in all position definitions with Anyone
            const updatedRequests = await this.removeRolesFromPositions(org, roleIds, session)

            // Now remove the roles from the org definition.
            org.roleDefinitions = org.roleDefinitions.filter(role => !roleIds.includes(role.id));
            // org.markModified('roleDefinitions');

            return {
                updatedOrg: await org.save({ session }),
                updatedRequests,
                updatedUsers
            }
        })
    }

    async removeRolesFromPositions(org: OrganizationDoc, roleIds: string[], session: ClientSession): Promise<HelpRequestDoc[]> {
        const allOrgRequests = await this.requests.find({
            orgId: org.id
        })

        const requestsToUpdate = allOrgRequests.map(req => {
            let updatedPositions = false;

            for (const idx in req.positions) {
                const pos = req.positions[idx];

                if (roleIds.includes(pos.role)) {
                    pos.role = DefaultRoleIds.Anyone
                    updatedPositions = true
                }
            }

            if (updatedPositions) {
                return req
            } else {
                return null
            }
        }).filter(r => !!r)

        const updatedRequests: HelpRequestDoc[] = []

        for (const req of requestsToUpdate) {
            // req.markModified('positions');
            updatedRequests.push(await req.save({ session }));
        }

        return updatedRequests
        // TODO(Shifts): Do the same thing for shift positions when we have them
    }

    async addRolesToUser(orgId: string, userId: string | UserDoc, roleIds: string[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw STRINGS.ACCOUNT.errorMessages.notInOrg;
        }

        const org = await this.resolveOrganization(orgId);
        for (const roleId of roleIds) {
            if (!org.roleDefinitions.some(roleDef => roleDef.id == roleId)) {
                throw STRINGS.SETTINGS.errorMessages.roleNotInOrg(roleId, orgId);
            }
        }

        await this.updateOrRemoveUsersOrgConfig(user, orgId, (orgConfig) => {
            const roleSet = new Set(orgConfig.roleIds);
            roleIds.forEach(r => roleSet.add(r));
            return Object.assign({}, orgConfig, { roleIds: Array.from(roleSet.values()) });
        })

        return await user.save();
    }

    // Attributes

    async addAttributeCategoriesToOrganization(orgId: string | OrganizationDoc, minCategories: MinAttributeCategory[]): Promise<[OrganizationDoc, AttributeCategory[]]> {
        const org = await this.resolveOrganization(orgId)
        const newCategories: AttributeCategory[] = [];

        for (const minCategory of minCategories) {
            if (this.checkForDupes(minCategory.name, org.attributeCategories)) {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.attributeCategoryExists(minCategory.name, org.id));
            }

            const newAttributeCategory: AttributeCategory = {
                id: uuid.v1(),
                name: minCategory.name,
                attributes: minCategory.attributes ? minCategory.attributes : []
            }

            org.attributeCategories.push(newAttributeCategory);
            
            newCategories.push(newAttributeCategory)
        }

        return [org, newCategories]
    }

    async editAttributeCategories(orgId: string | OrganizationDoc, categoryUpdates: AttributeCategoryUpdates[]): Promise<[OrganizationDoc, AttributeCategory[]]> {
        const org = await this.resolveOrganization(orgId);
        const editedAttributeCategories = []

        for (const categoryUpdate of categoryUpdates) {
            if (categoryUpdate.name && this.checkForDupes(categoryUpdate.name, org.attributeCategories.filter(cat => cat.id != categoryUpdate.id))) {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.attributeCategoryExists(categoryUpdate.name, org.id));
            }

            const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryUpdate.id);
            
            if (categoryIndex >= 0) {
                for (const prop in categoryUpdate) {
                    org.attributeCategories[categoryIndex][prop] = categoryUpdate[prop];
                }
                // org.markModified('attributeCategories');
                editedAttributeCategories.push(org.attributeCategories[categoryIndex])
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryUpdate.id, org.id));
            }
        }

        return [org, editedAttributeCategories]
    }

    async removeAttributeCategoryFromOrg(
        orgId: string | OrganizationDoc, 
        categoryId: string
    ): Promise<{
        updatedOrg: OrganizationDoc,
        updatedUsers: UserDoc[],
    }> {
        let org = await this.resolveOrganization(orgId);
        const usersToSave = new Set<UserDoc>()
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            for (let i = org.attributeCategories[categoryIndex].attributes.length - 1; i >= 0; i--) {
                // Removing the attribute from the attribute category itself.
                // Removing the attribute from users.
                const { updatedOrg, updatedUsers } = await this.removeAttributeFromOrg(org, categoryId, org.attributeCategories[categoryIndex].attributes[i].id);
                
                org = updatedOrg
                updatedUsers.forEach(user => usersToSave.add(user))
            }

            // Remove the attribute category from the organization.
            org.attributeCategories.splice(categoryIndex, 1);
            // org.markModified('attributeCategories');

            return {
                updatedOrg: org,
                updatedUsers: Array.from(usersToSave.values())
            }
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
    }

    async addAttributesToOrganization(orgId: string | OrganizationDoc, categoryId: string, minAttributes: MinAttribute[]): Promise<[OrganizationDoc, Attribute[]]> {
        const org = await this.resolveOrganization(orgId);
        const newAttributes: Attribute[] = [];
        
        for (const minAttribute of minAttributes) {
            const newAttribute: Attribute = {
                id: uuid.v1(),
                name: minAttribute.name
            }

            const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

            if (categoryIndex >= 0) {
                if (this.checkForDupes(newAttribute.name, org.attributeCategories[categoryIndex].attributes)) {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.attributeExistsInCategory(newAttribute.name, org.attributeCategories[categoryIndex].name, org.id));
                }

                org.attributeCategories[categoryIndex].attributes.push(newAttribute);
                // org.markModified('attributeCategories');
                newAttributes.push(newAttribute)
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
            }
        }

        return [org, newAttributes]
    }

    async editAttributes(orgId: string | OrganizationDoc, attributeUpdates: (AtLeast<Attribute, 'id'> & { categoryId: string })[]): Promise<[OrganizationDoc, (Attribute & { categoryId: string })[]]> {
        const org = await this.resolveOrganization(orgId);
        const editedAttributes: (Attribute & { categoryId: string })[] = []   

        for (const update of attributeUpdates) {
            const categoryId = update.categoryId;
            const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);
            
            if (categoryIndex >= 0) {
                if (update.name && this.checkForDupes(update.name, org.attributeCategories[categoryIndex].attributes.filter(attr => attr.id != update.id))) {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.attributeExistsInCategory(update.name, org.attributeCategories[categoryIndex].name, org.id));
                }

                const attributeIndex = org.attributeCategories[categoryIndex].attributes.findIndex(attr => attr.id == update.id);
                if (attributeIndex >= 0) {
                    for (const prop in update) {
                        org.attributeCategories[categoryIndex].attributes[attributeIndex][prop] = update[prop];
                    }
                    editedAttributes.push({
                        categoryId,
                        ...org.attributeCategories[categoryIndex].attributes[attributeIndex]
                    })
                    // org.markModified('attributeCategories');
                } else {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeInCategory(update.id, categoryId, org.id));
                }
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
            }
        }

        return [org, editedAttributes]
    }

    async removeAttributeFromOrg(
        orgId: string | OrganizationDoc, 
        categoryId: string, 
        attributeId: string,
    ): Promise<{
        updatedOrg: OrganizationDoc,
        updatedUsers: UserDoc[],
    }> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            const attributeIndex = org.attributeCategories[categoryIndex].attributes.findIndex(attr => attr.id == attributeId);

            if (attributeIndex >= 0) {
                // Remove the Attribute from the Attribute Category list.
                org.attributeCategories[categoryIndex].attributes.splice(attributeIndex, 1);
                // org.markModified('attributeCategories');

                // Create a map from user ID => attribute index (in the list of a user's attributes)
                // When we get the UserDoc[] from the DB, we'll remove the attribute at the index.
                const usersToSave: Map<UserDoc, number> = new Map();
                (org.members as UserModel[]).forEach(member => {
                    if (categoryId in member.organizations[org.id].attributes) {
                        let attrIndex = member.organizations[org.id].attributes[categoryId].findIndex(attrId => attrId == attributeId);
                        if (attrIndex >= 0) {
                            usersToSave.set(member as UserDoc, attrIndex);
                        }
                    }
                });

                // Retrieve the users from the DB by ID, and update their attributeIds list.
                const userIds = Array.from(usersToSave.keys());

                const updatedUsers: UserDoc[] = []

                for (const [user, attrIndex] of usersToSave) {
                    user.organizations[org.id].attributes[categoryId].splice(usersToSave[user.id], 1);
                    user.markModified('organizations');
                    updatedUsers.push(user);
                }

                return {
                    updatedOrg: org,
                    updatedUsers
                }
            }

            throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeInCategory(attributeId, categoryId, org.id));
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
    }

    async deleteAttributes(
        org: OrganizationDoc,
        categoriesToDelete: CategorizedItemUpdates['deletedCategories'],
        attributesToDelete: CategorizedItemUpdates['deletedItems']
    ): Promise<{
        updatedOrg: OrganizationDoc,
        updatedUsers: UserDoc[],
        updatedRequests: HelpRequestDoc[]
    }> {
        const usersToSave = new Set<UserDoc>()

        const allOrgRequests = await this.requests.find({
            orgId: org.id
        })
            
        // Delete Items (Attributes) from org/users
        for (const categoryId in attributesToDelete) {
            // deleting a category deletes its items
            if (categoriesToDelete.includes(categoryId)) {
                continue;
            }

            const itemsToDelete = attributesToDelete[categoryId];

            for (const itemId of itemsToDelete) {
                const { updatedOrg, updatedUsers } = await this.removeAttributeFromOrg(org, categoryId, itemId)

                org = updatedOrg;
                updatedUsers.forEach(user => usersToSave.add(user))
            }
        }

        // Delete Categories from org/users
        for (const categoryToDelete of categoriesToDelete) {
            const { updatedOrg, updatedUsers } = await this.removeAttributeCategoryFromOrg(org, categoryToDelete)

            org = updatedOrg;
            updatedUsers.forEach(user => usersToSave.add(user))
        }

        // Delete Items (Attributes) and Categories from positions
        const requestsToSave = await this.removeAttributesFromPositions(allOrgRequests, categoriesToDelete, attributesToDelete)

        return {
            updatedOrg: org,
            updatedRequests: requestsToSave,
            updatedUsers: Array.from(usersToSave.values())
        }
    }

    // TODO(Shifts): Do the same thing for shift positions when we have them
    async removeAttributesFromPositions(
        allOrgRequests: HelpRequestDoc[],
        categoriesToDelete: CategorizedItemUpdates['deletedCategories'],
        attributesToDelete: CategorizedItemUpdates['deletedItems'],
    ): Promise<HelpRequestDoc[]> {

        const requestsToUpdate = allOrgRequests.map(req => {
            let updatedPositions = false;

            for (const idx in req.positions) {
                const pos = req.positions[idx];

                const cleansedAttributes = pos.attributes.filter(a => {
                    return !categoriesToDelete.includes(a.categoryId) && (!attributesToDelete[a.categoryId] || !attributesToDelete[a.categoryId].includes[a.itemId])
                })
                
                if (pos.attributes.length > cleansedAttributes.length) {
                    pos.attributes = cleansedAttributes;
                    updatedPositions = true;
                }
            }

            if (updatedPositions) {
                return req
            } else {
                return null
            }
        }).filter(r => !!r)

        const updatedRequests: HelpRequestDoc[] = []

        for (const req of requestsToUpdate) {
            // req.markModified('positions');
            updatedRequests.push(req);
        }

        return updatedRequests
    }

    async removeAttributesFromUser(orgId: string, userId: string | UserDoc, attributes: AttributesMap) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        }

        await this.updateOrRemoveUsersOrgConfig(user, orgId, (orgConfig) => {
            for (const categoryId of Object.keys(attributes)) {
                if (categoryId in orgConfig.attributes) {
                    // Get pre-existing attributes in this category.
                    const categoryAttributeSet = new Set(orgConfig.attributes[categoryId]);
                    // Remove the provided attributes from the set of attributes for this category.
                    attributes[categoryId].forEach(attrId => categoryAttributeSet.delete(attrId));
                    orgConfig.attributes[categoryId] = Array.from(categoryAttributeSet);
                    if (orgConfig.attributes[categoryId].length == 0) {
                        delete orgConfig.attributes[categoryId];
                    }
                }
            }

            return orgConfig;
        })
        return await user.save();
    }

    // Tags

    async addTagCategoriesToOrganization(orgId: string | OrganizationDoc, minCategories: MinTagCategory[]): Promise<[OrganizationDoc, TagCategory[]]> {
        const org = await this.resolveOrganization(orgId);
        const newCategories: TagCategory[] = []

        for (const minCategory of minCategories) {
            if (this.checkForDupes(minCategory.name, org.tagCategories)) {
                throw STRINGS.SETTINGS.errorMessages.tagCategoryExists(minCategory.name, org.id);
            }

            const newTagCategory: TagCategory = {
                id: uuid.v1(),
                name: minCategory.name,
                tags: minCategory.tags ? minCategory.tags : []
            }

            org.tagCategories.push(newTagCategory);
            newCategories.push(newTagCategory)
        }

        return [org, newCategories]
    }

    async editTagCategories(orgId: string | OrganizationDoc, categoryUpdates: TagCategoryUpdates[]): Promise<[OrganizationDoc, TagCategory[]]> {
        const org = await this.resolveOrganization(orgId);
        const editedTagCategories = []

        for (const categoryUpdate of categoryUpdates) {
            if (categoryUpdate.name && this.checkForDupes(categoryUpdate.name, org.tagCategories.filter(cat => cat.id != categoryUpdate.id))) {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.tagCategoryExists(categoryUpdate.name, org.id));
            }

            const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryUpdate.id);
            if (categoryIndex >= 0) {
                for (const prop in categoryUpdate) {
                    org.tagCategories[categoryIndex][prop] = categoryUpdate[prop];
                }
                // org.markModified('tagCategories');
                editedTagCategories.push(org.tagCategories[categoryIndex])
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryUpdate.id, org.id));
            }
        }

        return [org, editedTagCategories]
    }

    async removeTagCategoryFromOrg(orgId: string | OrganizationDoc, categoryId: string): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            // Remove the tag category from the organization.
            org.tagCategories.splice(categoryIndex, 1);
            // org.markModified('tagCategories');
            return org;
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
    }

    async addTagsToOrganization(orgId: string | OrganizationDoc, categoryId: string, minTags: MinTag[]): Promise<[OrganizationDoc, Tag[]]> {
        const org = await this.resolveOrganization(orgId)
        const newTags: Tag[] = []
            
        for (const minTag of minTags) {
            const newTag: Tag = {
                id: uuid.v1(),
                name: minTag.name
            }

            const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

            if (categoryIndex >= 0) {
                if (this.checkForDupes(newTag.name, org.tagCategories[categoryIndex].tags)) {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.tagExistsInCategory(newTag.name, org.tagCategories[categoryIndex].name, org.id));
                }

                org.tagCategories[categoryIndex].tags.push(newTag);
                // org.markModified(`tagCategories.${categoryIndex}.tags`);
                newTags.push(newTag)
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
            }
        }

        return [org, newTags]
    }

    async editTags(orgId: string | OrganizationDoc, tagUpdates: (AtLeast<Tag, 'id'> & { categoryId: string })[]): Promise<[OrganizationDoc, (Tag & { categoryId: string })[]]> {
        const org = await this.resolveOrganization(orgId);
        const editedTags: (Tag & { categoryId: string })[] = []  

        for (const update of tagUpdates) {
            const categoryId = update.categoryId;
            const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

            if (categoryIndex >= 0) {
                if (this.checkForDupes(update.name, org.tagCategories[categoryIndex].tags.filter(tag => tag.id != update.id))) {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.tagExistsInCategory(update.name, org.tagCategories[categoryIndex].name, org.id));
                }

                const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == update.id);
                if (tagIndex >= 0) {
                    for (const prop in update) {
                        org.tagCategories[categoryIndex].tags[tagIndex][prop] = update[prop];
                    }
                    // org.markModified('tagCategories');
                    editedTags.push({
                        categoryId,
                        ...org.tagCategories[categoryIndex].tags[tagIndex]
                    })
                } else {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagInCategory(update.id, categoryId, org.id));
                }
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
            }
        }

        return [org, editedTags]
    }

    async deleteTags(
        org: OrganizationDoc,
        categoriesToDelete: CategorizedItemUpdates['deletedCategories'],
        tagsToDelete: CategorizedItemUpdates['deletedItems']
    ): Promise<{
        updatedOrg: OrganizationDoc,
        updatedRequests: HelpRequestDoc[]
    }> {
        for (const categoryId in tagsToDelete) {
            // deleting a category deletes its items
            if (categoriesToDelete.includes(categoryId)) {
                continue;
            }

            // delete individual tags in a category from the org
            const itemsToDelete = tagsToDelete[categoryId];

            org = await this.removeTagsFromOrg(org, categoryId, itemsToDelete)
        }

        // Delete whole tag categories from org
        for (const categoryToDelete of categoriesToDelete) {
            org = await this.removeTagCategoryFromOrg(org, categoryToDelete)
        }

        const requestsToSave = await this.removeTagsFromRequests(org.id, categoriesToDelete, tagsToDelete)

        return {
            updatedOrg: org,
            updatedRequests: requestsToSave
        }
    }

    async removeTagsFromOrg(
        orgId: string | OrganizationDoc, 
        categoryId: string, 
        tagIds: string[]
    ): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            for (const tagId of tagIds) {
                const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == tagId);

                // Remove the Tag from the Tag Category list.
                if (tagIndex >= 0) {
                    org.tagCategories[categoryIndex].tags.splice(tagIndex, 1);
                    // org.markModified('tagCategories');
                } else {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagInCategory(tagId, categoryId, org.id));
                }
            }

            return org
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
    }

    async removeTagsFromRequests(
        orgId: string,
        categoriesToDelete: CategorizedItemUpdates['deletedCategories'],
        tagsToDelete: CategorizedItemUpdates['deletedItems'],
    ): Promise<HelpRequestDoc[]> {

        const updatedRequests = new Map<string, HelpRequestDoc>()

        // Process requests affected by whole category deletes
        const requestsFromCategoryDeletes = await this.getRequests({ orgId })
            .where({ 
                tagHandles: { 
                    $elemMatch: {
                        categoryId: { 
                            $in: categoriesToDelete 
                        }
                    }
                }
            })

        for (const req of requestsFromCategoryDeletes) {
            // remove any tag with the matching categoryId
            let tagIndex = req.tagHandles.findIndex(handle => categoriesToDelete.includes[handle.categoryId]);
            
            if (tagIndex >= 0) {
                // Remove the tag from the help request's list of tags, and add to the list of requests to save.
               req.tagHandles.splice(tagIndex, 1);
            //    req.markModified('tagHandles');

               updatedRequests.set(req.id, req)
            }
        }

        // Process requests affected by individual tag deletes
        const tagsToDeleteSet = new Set<string>()

        for (const categoryId in tagsToDelete) {
            if (categoriesToDelete.includes(categoryId)) {
                continue;
            }

            tagsToDelete[categoryId].forEach(tag => tagsToDeleteSet.add(tag))
        }

        const requestsFromItemDeletes = (await this.getRequests({ orgId })
            .where({ 
                tagHandles: { 
                    $elemMatch: {
                        itemId: { 
                            // itemId's are pseudo unique...enough to scope a query by
                            $in: Array.from(tagsToDeleteSet.values())
                        }
                    }
                }
                // reuse edited requests that overlap
            })).map(req => updatedRequests.has(req.id) ? updatedRequests.get(req.id) : req)

        for (const req of requestsFromItemDeletes) {
            let tagIndex = req.tagHandles.findIndex(handle => tagsToDelete[handle.categoryId] && tagsToDelete[handle.categoryId].includes[handle.itemId]);
            
            if (tagIndex >= 0) {
                // Remove the tag from the help request's list of tags, and add to the list of requests to save.
               req.tagHandles.splice(tagIndex, 1);
            //    req.markModified('tagHandles');

               updatedRequests.set(req.id, req)
            }
        }

        return Array.from(updatedRequests.values())
    }

    checkForDupes(name: string, collection: AtLeast<any, 'name'>[]) {
        return collection.some(item => this.namesAreEqual(name, item.name));
    }

    namesAreEqual(first: string, second: string): boolean {
        // Case insensitive matching for now.
        return first.toLowerCase() == second.toLowerCase();
    }

    // AuthCodes

    async createAuthCode(userId: string): Promise<string> {
        const authCode = new this.authCodes({
            code: uuid.v1(),
            userId: userId
        });
        await authCode.save();

        return authCode.code;
    }


    async deleteAuthCode(code: string): Promise<void> {
        try {
            await this.authCodes.findOneAndDelete({ code: code });
        } catch(e) {
            return
        }
    }

    // Requests

    async createRequest(minhHelpRequest: MinHelpRequest, orgId: string, dispatcherId: string): Promise<HelpRequestDoc> {
        const req = new this.requests(minhHelpRequest);
        
        req.orgId = orgId;
        req.dispatcherId = dispatcherId;

        // no special lofic as creating a request always comes before notifying about it
        // ...which could change the status once people join etc.
        req.status ||= RequestStatus.Unassigned;

        const org = await this.resolveOrganization(orgId)

        return this.transaction(async (session) => {
            org.lastRequestId++;

            const displayId = `${org.lastRequestId}`
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

    async editRequestV2(helpRequest: string | HelpRequestDoc, requestUpdates: RequestUpdates) {
        const req = await this.resolveRequest(helpRequest);

        applyUpdateToRequest(req, requestUpdates)

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
                    userReceipts: new Map(),
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

                chat.userReceipts.set(user.id, chat.lastMessageId)
                
                return chat
            })
                
            return await helpRequest.save({ session });
        })
    }

    async updateRequestChatRecepit(helpRequest: HelpRequestDoc, userId: string, lastMessageId: number): Promise<HelpRequestDoc> {
        console.log(helpRequest.chat)
        
        const prevLastMessageId = helpRequest.chat.userReceipts.get(userId)

        console.log(prevLastMessageId + ' < ' + lastMessageId)
        
        if (!prevLastMessageId || (prevLastMessageId < lastMessageId)) {
            console.log('updating')
            this.updateHelpRequestChat(helpRequest, (chat: Chat) => {
                chat.userReceipts.set(userId, lastMessageId)
                return chat;
            })

            console.log('before save:')
            console.log(helpRequest.chat.userReceipts.get(userId))
        }

        const saved = await helpRequest.save()

        console.log('after save')
        console.log(saved.chat.userReceipts.get(userId))

        return saved
    }

    async notifyRespondersAboutRequest(requestId: string | HelpRequestDoc, notifierId: string, to: string[]) {
        const request = await this.resolveRequest(requestId);

        request.teamEvents.push({
            type: PatchEventType.RequestRespondersNotified,
            sentAt: new Date().toISOString(),
            by: notifierId,
            to: to
        } as RequestTeamEvent<PatchEventType.RequestRespondersNotified>)

        return await request.save();
    }

    async ackRequestNotification(requestId: string | HelpRequestDoc, userId: string) {
        const request = await this.resolveRequest(requestId);

        request.teamEvents.push({
            seenAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersNotificationAck,
            by: userId,
        } as RequestTeamEvent<PatchEventType.RequestRespondersNotificationAck>)

        return await request.save();
    }

    async ackRequestsToJoinNotification(requestId: string | HelpRequestDoc, ackerId: string, joinRequests: { userId: string, positionId: string }[]) {
        const request = await this.resolveRequest(requestId);
        
        for (const joinReq of joinRequests) {
            const position = request.positions.find(pos => pos.id == joinReq.positionId);

            // TODO: this should throw
            if (!position) {
                return request;
            }

            request.teamEvents.push({
                seenAt: new Date().toISOString(),
                type: PatchEventType.RequestRespondersRequestToJoinAck,
                requester: joinReq.userId,
                by: ackerId,
                position: joinReq.positionId
            } as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoinAck>)
        }

        return await request.save();
    }

    async confirmRequestToJoinPosition(orgId: string | OrganizationDoc, requestId: string | HelpRequestDoc, approverId: string, userId: string, positionId: string) {
        const request = await this.resolveRequest(requestId);

        const position = request.positions.find(pos => pos.id == positionId);

        // TODO: this should throw
        if (!position) {
            return request;
        }

        const userIdx = position.joinedUsers.findIndex(joinedUserId => joinedUserId == userId);

        // already joined
        if (userIdx != -1) {
            return request
        }

        position.joinedUsers.push(userId)

        request.markModified('positions');

        request.teamEvents.push({
            acceptedAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersAccepted,
            requester: userId,
            by: approverId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersAccepted>)

        const org = await this.resolveOrganization(orgId);

        request.status = resolveRequestStatus(request, org.removedMembers as string[])

        return await request.save()
    }

    async leaveRequest(orgId: string | OrganizationDoc, requestId: string | HelpRequestDoc, userId: string, positionId: string) {
        const request = await this.resolveRequest(requestId);

        const position = request.positions.find(pos => pos.id == positionId);

        // TODO: this should throw
        if (!position) {
            return request;
        }

        const userIdx = position.joinedUsers.findIndex(joinedUserId => joinedUserId == userId);

        if (userIdx == -1) {
            return request
        }

        position.joinedUsers.splice(userIdx, 1);

        request.markModified('positions');

        request.teamEvents.push({
            leftAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersLeft,
            user: userId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersLeft>)

        const org = await this.resolveOrganization(orgId);

        request.status = resolveRequestStatus(request, org.removedMembers as string[])

        return await request.save()
    }

    async requestToJoinRequest(requestId: string | HelpRequestDoc, userId: string, positionId: string) {
        const request = await this.resolveRequest(requestId);

        const position = request.positions.find(pos => pos.id == positionId);

        // TODO: this should throw
        if (!position) {
            return request;
        }

        const userIdx = position.joinedUsers.findIndex(joinedUserId => joinedUserId == userId);

        // already joined
        if (userIdx != -1) {
            return request
        }

        request.teamEvents.push({
            requestedAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersRequestToJoin,
            requester: userId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersRequestToJoin>)

        return await request.save()
    }

    async joinRequest(orgId: string | OrganizationDoc, requestId: string | HelpRequestDoc, userId: string, positionId: string) {
        const request = await this.resolveRequest(requestId);

        const position = request.positions.find(pos => pos.id == positionId);

        // TODO: this should throw
        if (!position) {
            return request;
        }

        const userIdx = position.joinedUsers.findIndex(joinedUserId => joinedUserId == userId);

        // already joined
        if (userIdx != -1) {
            return request
        }

        position.joinedUsers.push(userId);

        request.markModified('positions');

        request.teamEvents.push({
            joinedAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersJoined,
            user: userId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersJoined>)

        const org = await this.resolveOrganization(orgId);

        request.status = resolveRequestStatus(request, org.removedMembers as string[])

        return await request.save()
    }
    
    async declineRequestToJoinPosition(requestId: string | HelpRequestDoc, declinerId: string, userId: string, positionId: string) {
        const request = await this.resolveRequest(requestId);

        const position = request.positions.find(pos => pos.id == positionId);

        // TODO: this should throw
        if (!position) {
            return request;
        }

        request.teamEvents.push({
            deniedAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersDeclined,
            requester: userId,
            by: declinerId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersDeclined>)

        return await request.save()
    }

    async removeUserFromRequest(orgId: string | OrganizationDoc, revokerId: string, userId: string, requestId: string, positionId: string): Promise<HelpRequestDoc> {
        const request = await this.resolveRequest(requestId);
        const position = request.positions.find(pos => pos.id == positionId);
        const prefix = (await this.resolveOrganization(request.orgId)).requestPrefix;

        if (!position) {
            throw STRINGS.REQUESTS.errorMessages.positionNotOnRequest(prefix, request.displayId); 
        }

        const userIdx = position.joinedUsers.findIndex(joinedUserId => joinedUserId == userId);

        if (userIdx == -1) {
            throw new BadRequest(STRINGS.REQUESTS.POSITIONS.removeUser((await this.getUserById(userId)).name));
        }
        
        position.joinedUsers.splice(userIdx, 1);

        request.markModified('positions');
        
        request.teamEvents.push({
            revokedAt: new Date().toISOString(),
            type: PatchEventType.RequestRespondersRemoved,
            by: revokerId,
            user: userId,
            position: positionId
        } as RequestTeamEvent<PatchEventType.RequestRespondersRemoved>)

        const org = await this.resolveOrganization(orgId);

        request.status = resolveRequestStatus(request, org.removedMembers as string[])

        return await request.save();
    }

    async deleteRequest(requestId: string) {
        // remove the entry in the requests map under the request key
        await this.requests.findByIdAndDelete(requestId);
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

        await this.connection.transaction(async (freshSession) => {
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

    async bulkDelete<T>(model: Model<T>, docs: Document<T>[], session?: ClientSession) {
        if (!(docs && docs.length)) {
            return
        }

        const bulkOps = docs.map(doc => ({
            deleteOne: {
                filter: { _id: doc._id },
            }
        }))

        await this.transaction(async (session) => {
            await model.bulkWrite(bulkOps, { session });
        }, session)
    }

    async resolveOrganization(orgId: string | OrganizationDoc) {
        const org = typeof orgId === 'string' 
            ? await this.getOrganization({ _id: orgId })
            : orgId;

        if (!org) {
            throw STRINGS.errorMessages.unknownElement(STRINGS.ELEMENTS.organization) 
        }

        return org;
    }

    async resolveUser(userId: string | UserDoc) {
        const user = typeof userId === 'string'
            ? await this.getUser({ _id: userId })
            : userId;

        if (!user) {
            throw STRINGS.errorMessages.unknownElement(STRINGS.ELEMENTS.user)
        }

        return user;
    }

    async resolveRequest(requestId: string | HelpRequestDoc) {
        const req = typeof requestId === 'string'
            ? await this.getRequest({ _id: requestId })
            : requestId;

        if (!req) {
            throw STRINGS.errorMessages.unknownElement(STRINGS.ELEMENTS.request())
        }

        return req;
    }

    // util for us running scripts against an environmeent
    // TODO: need way to run scripts using dbmanager without having to run the whole 
    // server

    // @Every('5 minutes')
    async createOrg(
        partialAdmin: Partial<User>,
        users: Partial<User>[],
        orgName: string
    ) {
        try {
            console.log('Creating new org. Adding admin...');
            let admin = await this.createUser(partialAdmin)
            console.log('Adding org...');
            let [ newOrg, admin1 ] = await this.createOrganization({
                name: orgName
            }, admin.id);
            console.log('Org created: ', newOrg);
            console.log('Adding new users: ', users);
            for (const user of users) {
                let newUser = await this.createUser(user);
                [newOrg, newUser] = await this.addUserToOrganization(newOrg, newUser, [DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder], [])
            }
            console.log('Added new org: ', newOrg);
            console.log('* * * Remove script from dbManager.ts * * *');
        } catch (e) {
            console.error(e)
        }
    }
}