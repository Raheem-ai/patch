import { Inject, Service } from "@tsed/di";
import { Ref } from "@tsed/mongoose";
import { Chat, ChatMessage, HelpRequest, Me, MinHelpRequest, MinOrg, MinRole, MinUser, NotificationType, Organization, OrganizationMetadata, PatchPermissions, PendingUser, ProtectedUser, RequestSkill, RequestStatus, RequestType, Role, User, UserOrgConfig, UserRole } from "common/models";
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
            return await this.addUserToOrganization(org, newUser, pendingUser.roles, pendingUser.roleIDs);
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

            return await this.addUserToOrganization(org, adminId, [UserRole.Admin], [], session)
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

    async addUserToOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc, roles: UserRole[], roleIDs: string[], session?: ClientSession) {
        const user = await this.resolveUser(userId);
        const org = await this.resolveOrganization(orgId);

        user.organizations ||= {};

        if (user.organizations[org.id]) {
            throw `User is already a member of the organization`
        } else {
            await this.updateUsersOrgConfig(user, org.id, (_) => ({
                roles: roles,
                roleIDs: roleIDs,
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

    async addRolesToUser(orgId: string, userId: string | UserDoc, roleIDs: string[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations[orgId]){
            throw `User not in organization`
        }

        const org = await this.resolveOrganization(orgId);
        for (const roleId of roleIDs) {
            if (!org.roleDefinitions.some(roleDef => roleDef.id == roleId)) {
                throw `Role  ${roleId} does not exist in organization ${orgId}.`
            }
        }

        await this.updateUsersOrgConfig(user, orgId, (orgConfig) => {
            // TODO: probably should validate that the IDs exist in org.roleDefinitions?
            const roleSet = new Set(orgConfig.roleIDs);
            roleIDs.forEach(r => roleSet.add(r));
            return Object.assign({}, orgConfig, { roleIDs: Array.from(roleSet.values()) });
        })

        return await user.save();
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
        ] as [ OrganizationDoc, Role];
    }

    async removeRolesFromOrganization(orgId: string, roleIds: string[]): Promise<OrganizationDoc> {
        const org = await this.resolveOrganization(orgId);

        return this.transaction(async (session) => {
            for (let i = 0; i < org.members.length; i++) {
                for (const id in roleIds) {
                    /*
                    if (org.members[i].organizations[ordId].roleIDs.includes(id)) {

                    }
                    */
                }
            }

            org.markModified('members');
            const roleDefinitions: Role[] = [];
            org.roleDefinitions.forEach(role => {
                if (!roleIds.includes(role.id)) {
                    roleDefinitions.push(role);
                }
            });
    
            org.roleDefinitions = roleDefinitions;
            org.markModified('roleDefinitions');
            return await org.save({ session });
        })
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

            [ org, user2 ] = await this.addUserToOrganization(org, user2, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], []);
            [ org, user3 ] = await this.addUserToOrganization(org, user3, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], []);
            [ org, user4 ] = await this.addUserToOrganization(org, user4, [ UserRole.Responder, UserRole.Dispatcher, UserRole.Admin ], []);
            [ org, userAdmin ] = await this.addUserToOrganization(org, userAdmin, [ UserRole.Admin ], []);
            [ org, userDispatcher ] = await this.addUserToOrganization(org, userDispatcher, [ UserRole.Dispatcher ], []);
            [ org, userResponder ] = await this.addUserToOrganization(org, userResponder, [ UserRole.Responder ], []);

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

