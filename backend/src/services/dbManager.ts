import { Inject, Service } from "@tsed/di";
import { AdminEditableUser, Attribute, AttributeCategory, AttributeCategoryUpdates, AttributesMap, CategorizedItem, Chat, ChatMessage, DefaultRoleIds, DefaultRoles, DefaultAttributeCategories, DefaultTagCategories, HelpRequest, Me, MinAttribute, MinAttributeCategory, MinHelpRequest, MinRole, MinTag, MinTagCategory, MinUser, Organization, OrganizationMetadata, PatchEventType, PendingUser, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestType, Role, Tag, TagCategory, TagCategoryUpdates, User, UserOrgConfig } from "common/models";
import { UserDoc, UserModel } from "../models/user";
import { OrganizationDoc, OrganizationModel } from "../models/organization";
import { Agenda, Every } from "@tsed/agenda";
import { MongooseService } from "@tsed/mongoose";
import { ClientSession, Document, FilterQuery, Model, Query } from "mongoose";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";
import randomColor from 'randomcolor';
import * as uuid from 'uuid';
import { AtLeast } from "common";
import { BadRequest } from "@tsed/exceptions";
import { resolveRequestStatus } from "common/utils/requestUtils";
import STRINGS from "common/strings";
import { AuthCodeModel } from "../models/authCode";
import { hash } from 'bcrypt';

type DocFromModel<T extends Model<any>> = T extends Model<infer Doc> ? Document & Doc : never;

@Agenda()
@Service()
export class DBManager {
    
    @Inject(UserModel) users: Model<UserModel>;
    @Inject(OrganizationModel) orgs: Model<OrganizationModel>;
    @Inject(HelpRequestModel) requests: Model<HelpRequestModel>;
    @Inject(AuthCodeModel) authCodes: Model<AuthCodeModel>;

    @Inject(MongooseService) db: MongooseService;

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
        jsonOrg.removedMembers = jsonOrg.removedMembers.map(this.protectedUser).map(this.removedUser);

        return jsonOrg;
    }

    // TODO: need special type to see full user models on this that aren't a ref
    async fullOrganization(orgId: string | OrganizationDoc) {
        const org = await this.resolveOrganization(orgId);
        // TODO: I think this might be redundant with getOrganization's populate?
        const populatedOrg = (await org.populate({ path: 'members' }).execPopulate())

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
            await this.updateOrRemoveUsersOrgConfig(user, org.id, (_) => undefined)
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
            org.markModified('roleDefinitions');
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
    // TODO: delete
    async addAttributeCategoryToOrganization(orgId: string, minCategory: MinAttributeCategory): Promise<[OrganizationDoc, AttributeCategory]> {
        const org = await this.resolveOrganization(orgId)

        if (this.checkForDupes(minCategory.name, org.attributeCategories)) {
            throw STRINGS.SETTINGS.errorMessages.attributeCategoryExists(minCategory.name, orgId);
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

    // TODO: delete
    async editAttributeCategory(orgId: string, categoryUpdates: AttributeCategoryUpdates): Promise<[OrganizationDoc, AttributeCategory]> {
        const org = await this.resolveOrganization(orgId);

        if (categoryUpdates.name && this.checkForDupes(categoryUpdates.name, org.attributeCategories.filter(cat => cat.id != categoryUpdates.id))) {
            throw STRINGS.SETTINGS.errorMessages.attributeCategoryExists(categoryUpdates.name, orgId);
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

        throw STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryUpdates.id, orgId);
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
                org.markModified('attributeCategories');
                editedAttributeCategories.push(org.attributeCategories[categoryIndex])
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryUpdate.id, org.id));
            }
        }

        return [org, editedAttributeCategories]
    }

    // TODO: delete
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

        throw STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, orgId);
    }

    async removeAttributeCategoryWithSession(orgId: string | OrganizationDoc, categoryId: string, session: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            for (let i = org.attributeCategories[categoryIndex].attributes.length - 1; i >= 0; i--) {
                // Removing the attribute from the attribute category itself.
                // Removing the attribute from users.
                await this.removeAttributeWithSession(org, categoryId, org.attributeCategories[categoryIndex].attributes[i].id, session);
            }

            // Remove the attribute category from the organization.
            org.attributeCategories.splice(categoryIndex, 1);
            org.markModified('attributeCategories');
            return org
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
    }

    // TODO: delete
    async addAttributeToOrganization(orgId: string, categoryId: string, minAttribute: MinAttribute): Promise<[OrganizationDoc, Attribute]> {
        const org = await this.resolveOrganization(orgId);
        const newAttribute: Attribute = {
            id: uuid.v1(),
            name: minAttribute.name
        }

        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            if (this.checkForDupes(newAttribute.name, org.attributeCategories[categoryIndex].attributes)) {
                throw STRINGS.SETTINGS.errorMessages.attributeExistsInCategory(newAttribute.name, org.attributeCategories[categoryIndex].name, orgId); 
            }

            org.attributeCategories[categoryIndex].attributes.push(newAttribute);
            org.markModified('attributeCategories');
            return [
                await org.save(),
                newAttribute
            ]
        }

        throw STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id);
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
                org.markModified('attributeCategories');
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
                    org.markModified('attributeCategories');
                } else {
                    throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeInCategory(update.id, categoryId, org.id));
                }
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
            }
        }

        return [org, editedAttributes]
    }

    // TODO: Should we just take a list of attributeIds and not worry about categoryId since we have to look through
    // all the categories anyway to find the index (given ID)?
    // TODO: Use API for removing attribute from user.
    // TODO: delete !!!!!
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
                const usersToSave: Map<UserDoc, number> = new Map();
                (org.members as UserModel[]).forEach(member => {
                    if (categoryId in member.organizations[org.id].attributes) {
                        let attrIndex = member.organizations[org.id].attributes[categoryId].findIndex(attrId => attrId == attributeId);
                        if (attrIndex >= 0) {
                            usersToSave.set(member as UserDoc, attrIndex);
                        }
                    } else {
                        throw `User has no attributes in Attribute Category ${categoryId} in organization ${orgId}`; // what does this actually mean?
                    }
                });

                // Retrieve the users from the DB by ID, and update their attributeIds list.
                const userIds = Array.from(usersToSave.keys());
                if (session) {
                    for (const [user, attrIndex] of usersToSave) {
                        user.organizations[org.id].attributes[categoryId].splice(usersToSave[user.id], 1);
                        user.markModified('organizations');
                        await user.save({ session });
                    }
                    return await org.save({ session });
                } else {
                    return this.transaction(async (newSession) => {
                        for (const [user, attrIndex] of usersToSave) {
                            user.organizations[org.id].attributes[categoryId].splice(usersToSave[user.id], 1);
                            user.markModified('organizations');
                            await user.save({ session: newSession });
                        }
                        return await org.save({ session: newSession });
                    })
                }
            }

            throw STRINGS.SETTINGS.errorMessages.unknownAttributeInCategory(attributeId, categoryId, org.id);
        }

        throw STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id);
    }

    // TODO: this can be sped up by returning the users to be saved by the caller...ie if more than one attribute is removed that a user 
    // has, it will be saved for each attribute removal
    async removeAttributeWithSession(orgId: string | OrganizationDoc, categoryId: string, attributeId: string, session: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.attributeCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            const attributeIndex = org.attributeCategories[categoryIndex].attributes.findIndex(attr => attr.id == attributeId);

            if (attributeIndex >= 0) {
                // Remove the Attribute from the Attribute Category list.
                org.attributeCategories[categoryIndex].attributes.splice(attributeIndex, 1);
                org.markModified('attributeCategories');

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

                for (const [user, attrIndex] of usersToSave) {
                    user.organizations[org.id].attributes[categoryId].splice(usersToSave[user.id], 1);
                    user.markModified('organizations');
                    await user.save({ session });
                }

                // remove deleted attributes from positions that have them on them
                const allOrgRequests = await this.requests.find({
                    orgId: org.id
                })

                const requestsToUpdate = allOrgRequests.map(req => {
                    let updatedPositions = false;

                    for (const idx in req.positions) {
                        const pos = req.positions[idx];

                        const cleansedAttributes = pos.attributes.filter(a => !(a.categoryId == categoryId && a.itemId == attributeId))
                        
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

                for (const req of requestsToUpdate) {
                    req.markModified('positions');
                    await req.save({ session });
                }

                return org;
            }

            throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeInCategory(attributeId, categoryId, org.id));
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id));
    }

    // TODO: remove?...or maybe move validation to updateUser()?
    async addAttributesToUser(orgId: string | OrganizationDoc, userId: string | UserDoc, attributes: AttributesMap) {
        const user = await this.resolveUser(userId);
        const org = await this.resolveOrganization(orgId);

        if (!user.organizations || !user.organizations[org.id]){
            throw STRINGS.ACCOUNT.errorMessages.notInOrg;
        }

        // Validate attributes exist in the proper category.
        for (const categoryId of Object.keys(attributes)) {
            const category = org.attributeCategories.find(category => category.id == categoryId);
            if (category) {
                for (const attrId of attributes[categoryId]) {
                    if (!category.attributes.some(attr => attr.id == attrId)) {
                        throw STRINGS.SETTINGS.errorMessages.attributeNotInCategory(attrId, categoryId)
                    }
                }
            } else {
                throw STRINGS.SETTINGS.errorMessages.unknownAttributeCategory(categoryId, org.id);
            }
        }

        await this.updateOrRemoveUsersOrgConfig(user, org.id, (orgConfig) => {
            for (const categoryId of Object.keys(attributes)) {
                // Add this category ID to the user's org config if it doesn't already exist.
                if (!(categoryId in orgConfig.attributes)) {
                    orgConfig.attributes[categoryId] = [];
                }

                // Initialize set with pre-existing attributes in this category.
                const categoryAttributeSet = new Set(orgConfig.attributes[categoryId]);

                // Add the new attributes to the set of attributes for this category.
                attributes[categoryId].forEach(attrId => categoryAttributeSet.add(attrId));
                orgConfig.attributes[categoryId] = Array.from(categoryAttributeSet)
            }
            return orgConfig;
        })

        return await user.save();
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
    // TODO: delete
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

    // TODO: delete
    async editTagCategory(orgId: string, categoryUpdates: TagCategoryUpdates): Promise<[OrganizationDoc, TagCategory]> {
        const org = await this.resolveOrganization(orgId);

        if (categoryUpdates.name && this.checkForDupes(categoryUpdates.name, org.tagCategories.filter(cat => cat.id != categoryUpdates.id))) {
            throw STRINGS.SETTINGS.errorMessages.tagCategoryExists(categoryUpdates.name, orgId);
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

        throw STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryUpdates.id, orgId);
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
                org.markModified('tagCategories');
                editedTagCategories.push(org.tagCategories[categoryIndex])
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryUpdate.id, org.id));
            }
        }

        return [org, editedTagCategories]
    }

    // TODO: delete
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

        throw STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, orgId);
    }

    async removeTagCategoryWithSession(orgId: string | OrganizationDoc, categoryId: string, session: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            for (let i = org.tagCategories[categoryIndex].tags.length - 1; i >= 0; i--) {
                // Removing the tag from the tag category itself.
                // Removing the tag from help requests.
                await this.removeTag(org, categoryId, org.tagCategories[categoryIndex].tags[i].id, session);
            }

            // Remove the attribute category from the organization.
            org.tagCategories.splice(categoryIndex, 1);
            org.markModified('tagCategories');
            return org;
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
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
                throw STRINGS.SETTINGS.errorMessages.tagExistsInCategory(newTag.name, org.tagCategories[categoryIndex].name, orgId);
            }

            org.tagCategories[categoryIndex].tags.push(newTag);
            org.markModified('tagCategories');
            return [
                await org.save(),
                newTag
            ]
        }

        throw STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, orgId);
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
                org.markModified('tagCategories');
                newTags.push(newTag)
            } else {
                throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
            }
        }

        return [org, newTags]
    }

    // TODO: delete
    async editTag(orgId: string, categoryId: string, tagUpdates: AtLeast<Tag, 'id'>): Promise<[OrganizationDoc, Tag]> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);

        if (categoryIndex >= 0) {
            if (this.checkForDupes(tagUpdates.name, org.tagCategories[categoryIndex].tags.filter(tag => tag.id != tagUpdates.id))) {
                throw STRINGS.SETTINGS.errorMessages.tagExistsInCategory(tagUpdates.name, org.tagCategories[categoryIndex].name, org.id);
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

            throw STRINGS.SETTINGS.errorMessages.unknownTagInCategory(tagUpdates.id, categoryId, orgId);
        }

        throw STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, orgId);
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
                    org.markModified('tagCategories');
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

    // TODO: delete
    async removeTag(orgId: string | OrganizationDoc, categoryId: string, tagId: string, session?: ClientSession): Promise<OrganizationDoc> {
        // const org = await this.resolveOrganization(orgId);
        // const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);
        // if (categoryIndex >= 0) {
        //     const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == tagId);

        //     // Remove the Tag from the Tag Category list.
        //     if (tagIndex >= 0) {
        //         org.tagCategories[categoryIndex].tags.splice(tagIndex, 1);
        //         org.markModified('tagCategories');

        //         // Remove the tag id from Help Requests that currently have this tag.
        //         // TODO: Update mongo query to handle nested tag ID. https://www.mongodb.com/docs/manual/tutorial/query-embedded-documents/
        //         const requests: HelpRequestDoc[] = await this.getRequests({ orgId: org.id }).where({ tags: categoryId });
        //         for (let i = 0; i < requests.length; i++) {
        //             let tagIndex = requests[i].tags[categoryId].findIndex(id => id == tagId);
        //             if (tagIndex >= 0) {
        //                 // Remove the tag from the help request's list of tags, and add to the list of requests to save.
        //                 requests[i].tags[categoryId].splice(tagIndex, 1);
        //                 requests[i].markModified('tagIds');
        //             }
        //         }

        //         if (session) {
        //             // TODO: return all objects to be saved (requests and org)?
        //             // This would introduce different return types based on the path...
        //             // return [org, requests] vs. return or
        //             for (const request of requests) {
        //                 await request.save({ session });
        //             }

        //             return await org.save({ session });
        //         } else {
        //             return this.transaction(async (newSession) => {
        //                 for (const request of requests) {
        //                     await request.save({ session: newSession });
        //                 }
        //                 return await org.save({ session: newSession });
        //             })
        //         }
        //     }

        //     throw `Unknown Tag ${tagId} in Tag Category ${categoryId} in organization ${orgId}`;
        // }

        // throw `Unknown Tag Category ${categoryId} in organization ${orgId}`;
        return null;
    }

    // TODO: this can be sped up by returning the requests to be saved by the caller...ie if more than one attribute is removed that a request 
    // has, it will be saved for each attribute removal
    async removeTagWithSession(orgId: string | OrganizationDoc, categoryId: string, tagId: string, session: ClientSession): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);
        const categoryIndex = org.tagCategories.findIndex(category => category.id == categoryId);
        if (categoryIndex >= 0) {
            const tagIndex = org.tagCategories[categoryIndex].tags.findIndex(tag => tag.id == tagId);

            // Remove the Tag from the Tag Category list.
            if (tagIndex >= 0) {
                const [tag] = org.tagCategories[categoryIndex].tags.splice(tagIndex, 1);
                org.markModified('tagCategories');

                // Remove the tag id from Help Requests that currently have this tag.
                // TODO: test mongo query handles nested tag ID. https://www.mongodb.com/docs/manual/tutorial/query-embedded-documents/
                const item: CategorizedItem = {
                    categoryId: categoryId,
                    itemId: tag.id
                }

                const requests: HelpRequestDoc[] = await this.getRequests({ orgId: org.id }).where({ tagHandles: item });
                
                for (let i = 0; i < requests.length; i++) {
                    let tagIndex = requests[i].tagHandles.findIndex(handle => handle.itemId == tagId && handle.categoryId == categoryId);
                    
                    if (tagIndex >= 0) {
                        // Remove the tag from the help request's list of tags, and add to the list of requests to save.
                        requests[i].tagHandles.splice(tagIndex, 1);
                        requests[i].markModified('tagHandles');
                    }
                }

                for (const request of requests) {
                    await request.save({ session });
                }

                return org;
            }

            throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagInCategory(tagId, categoryId, org.id));
        }

        throw new BadRequest(STRINGS.SETTINGS.errorMessages.unknownTagCategory(categoryId, org.id));
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

        // TODO: move to strings.ts ... what's up with the double quotes?
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

    // @Every('5 minutes', { name: `Repopulating` })
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
                name: "Charlie Lipford",
                race: "nunya",
                phone: "8045166822",
                // skills: [ RequestSkill.CPR, RequestSkill.ConflictResolution, RequestSkill.MentalHealth ]
            });

            let [ org, admin1 ] = await this.createOrganization({
                name: 'Community Response Program'
            }, user1.id);


            let user2 = await this.createUser({ 
                email: 'Nadav@test.com', 
                password: 'Test',
                name: 'Nadav Savio',
            });

            let user3 = await this.createUser({ 
                email: 'Cosette@test.com', 
                password: 'Test',
                name: 'Cosette Ayele',
            });

            let user4 = await this.createUser({ 
                email: 'Tevn@test.com', 
                password: 'Test',
                name: `Tev'n Powers`,
            });

            let userAdmin = await this.createUser({ 
                email: 'admin@test.com', 
                password: 'Test',
                name: 'Admin',
            });

            let userDispatcher = await this.createUser({ 
                email: 'dispatcher@test.com', 
                password: 'Test',
                name: 'Dispatcher',
            });

            let userResponder = await this.createUser({ 
                email: 'responder@test.com', 
                password: 'Test',
                name: 'Responder',
            });

            let user5 = await this.createUser({ 
                email: 'Tevn2@test.com', 
                password: 'Test',
                name: 'Tevy Tev2',
            });

            [ org, user2 ] = await this.addUserToOrganization(org, user2, [], []);
            [ org, user3 ] = await this.addUserToOrganization(org, user3, [], []);
            [ org, user4 ] = await this.addUserToOrganization(org, user4, [], []);
            [ org, user5 ] = await this.addUserToOrganization(org, user5, [], []);
            [ org, userAdmin ] = await this.addUserToOrganization(org, userAdmin, [], []);
            [ org, userDispatcher ] = await this.addUserToOrganization(org, userDispatcher, [], []);
            [ org, userResponder ] = await this.addUserToOrganization(org, userResponder, [], []);

            user1 = await this.addRolesToUser(org.id, user1.id, [ DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user2 = await this.addRolesToUser(org.id, user2.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user3 = await this.addRolesToUser(org.id, user3.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ])
            user4 = await this.addRolesToUser(org.id, user4.id, [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher, DefaultRoleIds.Responder ]);

            let trainingsAttribute: AttributeCategory, 
                cprAttribute: Attribute, 
                firstAidAttribute: Attribute,
                copWatchAttribute: Attribute;

            let languageAttribute: AttributeCategory, 
                spanishAttribute: Attribute, 
                japaneseAttribute: Attribute,
                swahiliAttribute: Attribute;

            [org, trainingsAttribute] = await this.addAttributeCategoryToOrganization(org.id, {
                name: 'Trainings'
            });

            [org, cprAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
                name: 'CPR'
            });

            [org, firstAidAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
                name: 'First Aid'
            });

            [org, copWatchAttribute] = await this.addAttributeToOrganization(org.id, trainingsAttribute.id, {
                name: 'Cop Watch'
            });

            [org, languageAttribute] = await this.addAttributeCategoryToOrganization(org.id, {
                name: 'Languages'
            });

            [org, spanishAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
                name: 'Spanish'
            });

            [org, japaneseAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
                name: 'Japanese'
            });

            [org, swahiliAttribute] = await this.addAttributeToOrganization(org.id, languageAttribute.id, {
                name: 'Swahili'
            });

            let weaponCategory: TagCategory, 
                gunTag: Tag, 
                knifeTag: Tag,
                molotovTag: Tag;

            [org, weaponCategory] = await this.addTagCategoryToOrganization(org.id, {
                name: 'Weapons'
            });

            [org, gunTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
                name: 'Gun'
            });

            [org, knifeTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
                name: 'Knife'
            });

            [org, molotovTag] = await this.addTagToOrganization(org.id, weaponCategory.id, {
                name: 'Molotov cocktail'
            });

            console.log('Assigning attributes to users');

            const allAttributes: CategorizedItem[] = [
                { categoryId: trainingsAttribute.id, itemId: cprAttribute.id },
                { categoryId: trainingsAttribute.id, itemId: firstAidAttribute.id },
                { categoryId: trainingsAttribute.id, itemId: copWatchAttribute.id },

                { categoryId: languageAttribute.id, itemId: spanishAttribute.id },
                { categoryId: languageAttribute.id, itemId: swahiliAttribute.id },
                { categoryId: languageAttribute.id, itemId: japaneseAttribute.id },
            ]

            user1 = await this.updateUser(org.id, user1, {
                attributes: allAttributes.slice(2, 4)
            })

            user2 = await this.updateUser(org.id, user2, {
                attributes: allAttributes.slice(0, 1)
            })

            user3 = await this.updateUser(org.id, user3, {
                attributes: allAttributes.slice(0, -2)
            })

            user4 = await this.updateUser(org.id, user4, {
                attributes: allAttributes.slice(4, 5)
            })

            user5 = await this.updateUser(org.id, user5, {
                attributes: allAttributes.slice(1, 3)
            })

            const allPositionSetups: Position[] = [
                {
                    id: 'catchall',
                    attributes: [],
                    min: 1,
                    max: -1,
                    role: DefaultRoleIds.Anyone,
                    joinedUsers: []
                },
                {
                    id: 'specific',
                    attributes: [{ itemId: cprAttribute.id, categoryId: trainingsAttribute.id }],
                    min: 2,
                    max: 2,
                    role: DefaultRoleIds.Responder,
                    joinedUsers: []
                },
                {
                    id: 'dispatcher',
                    attributes: [{ itemId: firstAidAttribute.id, categoryId: trainingsAttribute.id }],
                    min: 1,
                    max: 3,
                    role: DefaultRoleIds.Dispatcher,
                    joinedUsers: []
                }
            ]

            const minRequests: MinHelpRequest[] = [
                {
                    type: [RequestType.CallerInDanger, RequestType.DirectActionAssistance],
                    location: {
                        latitude: 40.69776419999999,
                        longitude: -73.9303333,
                        address: "960 Willoughby Avenue, Brooklyn, NY, USA"
                    },
                    tagHandles: [{ categoryId: weaponCategory.id, itemId: molotovTag.id }],
                    positions: allPositionSetups.slice(0, 2),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                },
                {
                    type: [RequestType.CallerInDanger, RequestType.Fireworks, RequestType.SelfHarming],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(1, 2),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
                },
                {
                    type: [RequestType.CallerInDanger],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(-1),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                },
                {
                    type: [RequestType.Carjacking],
                    location: {
                        latitude: 40.70107496314848,
                        longitude: -73.90470642596483,
                        address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
                    },
                    positions: allPositionSetups.slice(0, 1),
                    notes: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut',
                    status: RequestStatus.Done
                }
            ];

            const fullReqs: HelpRequestDoc[] = [];
            
            console.log('creating requests')
            for (const req of minRequests) {
                fullReqs.push(await this.createRequest(req, org.id, admin1.id))
            }

            let reqWithMessage = await this.sendMessageToReq(user1, fullReqs[0], 'Message one...blah blah blah')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Two!')
            reqWithMessage = await this.sendMessageToReq(user2, reqWithMessage, 'Message Three!...blah blah blah...blah blah blah blah blah bliggity blah')

            // notify people 
            reqWithMessage = await this.notifyRespondersAboutRequest(reqWithMessage, user1.id, [user2.id, user3.id, user4.id, user5.id])

            // ack notification
            reqWithMessage = await this.ackRequestNotification(reqWithMessage, user2.id);

            // join
            reqWithMessage = await this.joinRequest(org.id, reqWithMessage, user4.id, reqWithMessage.positions[0].id)

            // leave

            // request
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user5.id, reqWithMessage.positions[0].id)
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user3.id, reqWithMessage.positions[0].id)

            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user5.id, reqWithMessage.positions[1].id)
            reqWithMessage = await this.requestToJoinRequest(reqWithMessage, user3.id, reqWithMessage.positions[1].id)
            
            // ack request
            reqWithMessage = await this.ackRequestsToJoinNotification(reqWithMessage, user1.id, [
                { userId: user5.id, positionId: reqWithMessage.positions[0].id },
                { userId: user3.id, positionId: reqWithMessage.positions[0].id }
            ])

            // accept
            reqWithMessage =  await this.confirmRequestToJoinPosition(org.id, reqWithMessage, user1.id, user5.id, reqWithMessage.positions[0].id)

            // deny request
            reqWithMessage =  await this.declineRequestToJoinPosition(reqWithMessage, user1.id, user3.id, reqWithMessage.positions[0].id)

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

