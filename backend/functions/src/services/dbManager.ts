import { Inject, Service } from "@tsed/di";
import { MongooseDocument, MongooseModel } from "@tsed/mongoose";
import { Me, Organization, ProtectedUser, UserRole } from "common/models";
import { NotificationModel } from "../models/notification";
import { UserModel } from "../models/user";
import { OrganizationModel } from "../models/organization";
import { Agenda, Every } from "@tsed/agenda";
import { inspect } from "util";
import {MongooseService} from "@tsed/mongoose";
import { ClientSession } from "mongoose";

@Agenda()
@Service()
export class DBManager {
    @Inject(NotificationModel) notifications: MongooseModel<NotificationModel>;
    @Inject(UserModel) users: MongooseModel<UserModel>;
    @Inject(OrganizationModel) orgs: MongooseModel<OrganizationModel>;
    @Inject(MongooseService) db: MongooseService;

    // the 'me' api handles returning non-system props along with personal
    // ones so the user has access...everywhere else a user is 
    // visible should only show non-system/personal properties
    privateUserProps() {
        return Object.assign({}, UserModel.systemProperties, UserModel.personalProperties);
    }

    protectedUser(user: MongooseDocument<UserModel>): ProtectedUser {
        const userJson = user.toJSON();

        for (const key in UserModel.systemProperties) {
            userJson[key] = undefined
        }

        for (const key in UserModel.personalProperties) {
            userJson[key] = undefined
        }

        return userJson
    }

    me(user: MongooseDocument<UserModel>): Me {
        const userJson = user.toJSON();

        for (const key in UserModel.systemProperties) {
            userJson[key] = undefined
        }

        return userJson
    }

    async createUser(minUser: Partial<UserModel>): Promise<MongooseDocument<UserModel>> {
        const user = new this.users(minUser)
        return await user.save();
    }

    async createOrganization(minOrg: Partial<OrganizationModel>, adminId: string) {
        return this.transaction(async (session) => {
            const newOrg = await (new this.orgs(minOrg)).save({ session })
            return await this.addUserToOrganization(newOrg.id, adminId, [UserRole.Admin], session)
        })
    }
    
    async getUser(query: Partial<UserModel>): Promise<MongooseDocument<UserModel>> {
        return await this.users.findOne(query);
    }

    async getUsers(query: Partial<UserModel>): Promise<MongooseDocument<UserModel>[]> {
        return await this.users.find(query);
    }

    async getProtectedUser(query: Partial<UserModel>): Promise<MongooseDocument<ProtectedUser>> {
        return await this.users.findOne(query).select(this.privateUserProps());
    }

    async getProtectedUsers(query: Partial<UserModel>): Promise<MongooseDocument<ProtectedUser>[]> {
        return await this.users.find(query).select(this.privateUserProps());
    }

    async getOrganization(query: Partial<OrganizationModel>): Promise<MongooseDocument<OrganizationModel>> {
        return await this.orgs.findOne(query).populate('members', this.privateUserProps());
    }

    async addUserToOrganization(orgId: string | MongooseDocument<OrganizationModel>, userId: string | MongooseDocument<UserModel>, roles: UserRole[], session?: ClientSession) {
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

    async removeUserFromOrganization(orgId: string | MongooseDocument<OrganizationModel>, userId: string | MongooseDocument<UserModel>) {
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

    async addUserRoles(orgId: string, userId: string | MongooseDocument<UserModel>, roles: UserRole[]) {
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

    async removeUserRoles(orgId: string, userId: string | MongooseDocument<UserModel>, roles: UserRole[]) {
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

    // HELPERS

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

    async bulkUpsert<T>(model: MongooseModel<T>, docs: MongooseDocument<T>[]) {
        const bulkOps = docs.map(doc => ({
            updateOne: {
                filter: { _id: doc._id },
                update: doc.toJSON(),
                upsert: true,
            }
        }))

        await model.bulkWrite(bulkOps);
    }

    async bulkDelete<T>(model: MongooseModel<T>, docs: MongooseDocument<T>[]) {
        const bulkOps = docs.map(doc => ({
            deleteOne: {
                filter: { _id: doc._id },
            }
        }))

        await model.bulkWrite(bulkOps);
    }

    async resolveOrganization(orgId: string | MongooseDocument<OrganizationModel>) {
        const org = typeof orgId === 'string' 
            ? await this.getOrganization({ _id: orgId })
            : orgId;

        if (!org) {
            throw `Unknown organization`
        }

        return org;
    }

    async resolveUser(userId: string | MongooseDocument<UserModel>) {
        const user = typeof userId === 'string'
            ? await this.getUser({ _id: userId })
            : userId;

        if (!user) {
            throw `Unknown user`
        }

        return user;
    }

    @Every('30 seconds', { name: `E2E Test` })
    async test() {
        try {
            let user = await this.createUser({
                name: 'Foo',
                email: 'email@test.com',
                password: 'bar',
                race: 'nunya'
            });

            let [ org, admin ] = await this.createOrganization({
                name: 'Foo Org'
            }, user.id);

            [ org, admin ] = await this.addUserToOrganization(org, admin, [ UserRole.Dispatcher, UserRole.Responder ]);

            admin = await this.addUserRoles(org.id, admin, [2, 3, 4, 5])
            admin = await this.removeUserRoles(org.id, admin, [2, 3])

            console.log(inspect((await this.getUser({ _id: admin.id })).toObject(), null, 4));
            // console.log(inspect((await this.getOrganization({ _id: org.id })).toObject(), null, 4))

            [ org, admin ] = await this.removeUserFromOrganization(org, admin);

            console.log(inspect([org, admin], null, 5));

            // console.log((await this.getUser({ _id: user.id })).toJSON());
            // console.log((await this.getOrganization({ _id: org.id })).toJSON())

            await Promise.all([
                admin.delete(),
                org.delete()
            ])
        } catch (e) {
            console.error(e)
        }
    }
}

