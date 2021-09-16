import { Inject, Service } from "@tsed/di";
import { Ref } from "@tsed/mongoose";
import { HelpRequest, Me, MinHelpRequest, Organization, ProtectedUser, RequestStatus, UserRole } from "common/models";
import { NotificationModel } from "../models/notification";
import { UserDoc, UserModel } from "../models/user";
import { OrganizationDoc, OrganizationModel } from "../models/organization";
import { Agenda, Every } from "@tsed/agenda";
import { inspect } from "util";
import {MongooseService} from "@tsed/mongoose";
import { ClientSession, Document, FilterQuery, Model, Query } from "mongoose";
import { Populated } from "../models";
import { HelpRequestDoc, HelpRequestModel } from "../models/helpRequest";

type DocFromModel<T extends Model<any>> = T extends Model<infer Doc> ? Document & Doc : never;

@Agenda()
@Service()
export class DBManager {
    @Inject(NotificationModel) notifications: Model<NotificationModel>;
    @Inject(UserModel) users: Model<UserModel>;
    @Inject(OrganizationModel) orgs: Model<OrganizationModel>;
    @Inject(HelpRequestModel) requests: Model<HelpRequestModel>

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

    protectedUser(user: UserModel): ProtectedUser {
        for (const key in UserModel.systemProperties) {
            user[key] = undefined
        }

        for (const key in UserModel.personalProperties) {
            user[key] = undefined
        }

        return user
    }

    me(user: UserDoc): Me {
        const userJson = user.toJSON();

        for (const key in UserModel.systemProperties) {
            userJson[key] = undefined
        }

        return userJson
    }

    protectedOrganization(org: OrganizationDoc): Organization {
        if (!org.populated('members')) {
            org = org.populate({ path: 'members', select: this.privateUserProps() });
            return org.toJSON() as Organization
        }

        const jsonOrg = org.toJSON() as Organization;
        jsonOrg.members = jsonOrg.members.map(this.protectedUser);

        return jsonOrg;
    }

    async createUser(minUser: Partial<UserModel>): Promise<UserDoc> {
        const user = new this.users(minUser)
        return await user.save();
    }

    async createOrganization(minOrg: Partial<OrganizationModel>, adminId: string) {
        return this.transaction(async (session) => {
            const newOrg = await (new this.orgs(minOrg)).save({ session })
            return await this.addUserToOrganization(newOrg, adminId, [UserRole.Admin], session)
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

    async getProtectedUser(query: Partial<UserModel>): Promise<Document<ProtectedUser>> {
        return await this.users.findOne(query).select(this.privateUserProps());
    }

    async getProtectedUsers(query: Partial<UserModel>): Promise<Document<ProtectedUser>[]> {
        return await this.users.find(query).select(this.privateUserProps());
    }

    async getOrganization(query: Partial<OrganizationModel>): Promise<OrganizationDoc> {
        return await this.orgs.findOne(query).populate('members')
    }

    async getOrgResponders(orgId: string): Promise<ProtectedUser[]> {
        const org = await this.resolveOrganization(orgId);
        const responders: ProtectedUser[] = []

        for (const possibleMember of org.members as Ref<UserDoc>[]) {
            const member = await this.resolveUser(possibleMember);
            const roles = member.organizations.get(orgId).roles;

            if (!!roles && roles.includes(UserRole.Responder)) {
                responders.push(this.protectedUserFromDoc(member));
            }
        }

        return responders;
    }

    async addUserToOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc, roles: UserRole[], session?: ClientSession) {
        const user = await this.resolveUser(userId);

        const org = await this.resolveOrganization(orgId);

        if (!user.organizations) {
            user.organizations = new Map();
        } 
        
        if (user.organizations.has(org.id)) {
            throw `User is already a member of the organization`
        } else {
            user.organizations.set(org.id, {
                roles: roles
            })
        }

        // add the userId to the members array
        org.members.push(userId)

        // save both in transaction
        return this.transaction((session) => {
            return Promise.all([
                org.save({ session }),
                user.save({ session })
            ]);
        }, session)
    }

    async removeUserFromOrganization(orgId: string | OrganizationDoc, userId: string | UserDoc) {
        const user = await this.resolveUser(userId);

        const org = await this.resolveOrganization(orgId);

        // remove the entry in the organization map under the org key
        if (user.organizations && user.organizations.has(org.id)) {
            user.organizations.delete(org.id);
        } 

        // remove the userId from the members array
        org.members.splice(org.members.findIndex((m) => {
            if (typeof m === 'string') {
                return m === userId
            } else {
                return m.id === userId
            }
        }), 1)

        // save both
        return this.transaction((session) => {
            return Promise.all([
                org.save({ session }),
                user.save({ session })
            ]);
        })
    }

    async addUserRoles(orgId: string, userId: string | UserDoc, roles: UserRole[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations.has(orgId)) {
            throw `User not in organization`
        } else {
            const orgConfig = user.organizations.get(orgId);
            const rollSet = new Set(orgConfig.roles);

            roles.forEach(r => rollSet.add(r));

            const updatedOrgConfig = Object.assign({}, orgConfig, { roles: Array.from(rollSet.values()) });

            user.organizations.set(orgId, updatedOrgConfig)
        }

        return await user.save();
    }

    async removeUserRoles(orgId: string, userId: string | UserDoc, roles: UserRole[]) {
        const user = await this.resolveUser(userId);

        if (!user.organizations || !user.organizations.has(orgId)) {
            throw `User not in organization`
        } else {
            const orgConfig = user.organizations.get(orgId);
            const rollSet = new Set(orgConfig.roles);

            roles.forEach(r => rollSet.delete(r));

            const updatedOrgConfig = Object.assign({}, orgConfig, { roles: Array.from(rollSet.values()) });

            user.organizations.set(orgId, updatedOrgConfig)
        }

        return await user.save();
    }

    // Requests

    async createRequest(minhHelpRequest: MinHelpRequest, orgId: string, dispatcherId: string): Promise<HelpRequestDoc> {
        const req = new this.requests(minhHelpRequest);
        req.orgId = orgId;
        req.dispatcherId = dispatcherId;
        req.status = RequestStatus.Unassigned;

        return await req.save();
    }

    async getRequest(query: Partial<HelpRequestModel>): Promise<HelpRequestDoc> {
        return await this.requests.findOne(query);
    }

    getRequests(query: FilterQuery<HelpRequestModel>) {
        return this.requests.find(query);
    }

    async getUnfinishedRequests(orgId: string): Promise<HelpRequestDoc[]> {
        return this.getRequests({ orgId })
            .where('status').ne(RequestStatus.Done);
    }

    // HELPERS

    findByIds<M extends Model<any>, D=DocFromModel<M>>(model: M, ids: string[]): Query<D[], D> {
        return model.find({ _id: { $in: ids } });
    }

    async transaction<T extends (session: ClientSession) => Promise<any>>(ops: T, session?: ClientSession): Promise<ReturnType<T>> {
        // allow individual methods to honor a transaction they are already in without having to change their
        // call structure
        if (session) {
            return await ops(session);
        }
        
        let retVal;

        await this.db.get().transaction(async (session) => {
            retVal = await ops(session);
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
            throw `Unknown user`
        }

        return user;
    }

    // @Every('30 seconds', { name: `E2E Test` })
    async test() {
        try {
            let user = await this.getUser({ email: 'Test@test.com' });

            let [ org, admin ] = await this.createOrganization({
                name: 'Foo Org'
            }, user.id);

            admin = await this.addUserRoles(org.id, admin, [ UserRole.Dispatcher, UserRole.Responder ]);

            // admin = await this.addUserRoles(org.id, admin, [2, 3, 4, 5])
            // admin = await this.removeUserRoles(org.id, admin, [2, 3])

            console.log(inspect(admin.toObject(), null, 4));
            // console.log(inspect((await this.getOrganization({ _id: org.id })).toObject(), null, 4))

            // [ org, admin ] = await this.removeUserFromOrganization(org, admin);

            // console.log(inspect([org, admin], null, 5));

            // console.log((await this.getUser({ _id: user.id })).toJSON());
            // console.log((await this.getOrganization({ _id: org.id })).toJSON())

            // await Promise.all([
            //     admin.delete(),
            //     org.delete()
            // ])
        } catch (e) {
            console.error(e)
        }
    }
}

