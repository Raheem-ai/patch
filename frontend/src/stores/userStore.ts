import { makeAutoObservable, ObservableMap, runInAction } from 'mobx';
import { AttributesMap, AuthTokens, EditableMe, EditableUser, Me, MinUser, ProtectedUser, RequestSkill, UserRole } from '../../../common/models';
import { Store } from './meta';
import { IUserStore } from './interfaces';
import { ClientSideFormat, OrgContext } from '../../../common/api';
import { navigateTo } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';
import { clearAllStores } from './utils';
import { clearAllServices } from '../services/utils';

@Store(IUserStore)
export default class UserStore implements IUserStore {

    private api = getService<IAPIService>(IAPIService)

    @persistent()
    user!: ClientSideFormat<Me>;

    @persistent() 
    authToken: string;

    @persistent()
    currentOrgId: string;

    loadingCurrentUser = false;

    currentUser: ClientSideFormat<ProtectedUser>;

    users: ObservableMap<string, ClientSideFormat<ProtectedUser>> = new ObservableMap()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        if (this.signedIn) {
            // this effectively validates that your refresh token is still valid
            // by calling a method that takes you through the refresh auth flow
            // and signs you out if the refresh token has expired
            await this.api.init()
            await this.getLatestMe();
        }
    }

    clear() {
        runInAction(() => {
            this.user = null
            this.authToken = null
            this.currentOrgId = null
            this.users = new ObservableMap()
        })
    }

    orgContext(token?: string): OrgContext {
        return {
            token: token || this.authToken,
            orgId: this.currentOrgId
        }
    }

    get usersInOrg() {
        return Array.from(this.users.values())
            .filter(u => {
                return !!u.organizations[this.currentOrgId]
            })
    }

    get isOnDuty() {
        if (!this.currentOrgId) {
            return false
        }

        const org = this.user.organizations[this.currentOrgId];

        return !!org?.onDuty;
    }

    get signedIn() {
        return !!this.user;
    }

    get isResponder(): boolean {
        if (!this.currentOrgId) {
            return false
        }

        const org = this.user.organizations[this.currentOrgId];
        return org.roles.includes(UserRole.Responder);
    }

    get isDispatcher(): boolean {
        if (!this.currentOrgId) {
            return false
        }

        const org = this.user.organizations[this.currentOrgId];
        return org.roles.includes(UserRole.Dispatcher);
    }

    get isAdmin(): boolean {
        if (!this.currentOrgId) {
            return false
        }

        const org = this.user.organizations[this.currentOrgId];
        return org.roles.includes(UserRole.Admin);
    }

    onSignedOut = () => {
        // TODO: make general 'was signed out' flow that safely clears all stores
    }

    async afterSignIn(authTokens: AuthTokens) {
        const token = authTokens.accessToken;

        const user = await this.api.me({ token });

        const keys = Object.keys(user.organizations);

        const orgId = !!this.currentOrgId && keys.includes(this.currentOrgId)
            ? this.currentOrgId
            : keys[0]

        // need to fetch all data needed for BottomDrawer views before setting the user
        // which starts unlocking views that require you to be signed in
        if (orgId) {
            await this.updateOrgUsers([], { token, orgId })
        }

        await this.getLatestMe({ me: user, token })
    }
    
    async signIn(email: string, password: string) {
        try {
            const authTokens = await this.api.signIn({ email, password })
            await this.afterSignIn(authTokens);
        } catch (e) {
            console.error(e);
        }
    }

    async signUp(minUser: MinUser) {
        try {
            const authTokens = await this.api.signUp(minUser)
            await this.afterSignIn(authTokens);
        } catch (e) {
            console.error(e);
        }
    }

    async signOut() {
        try {
            const token = this.authToken;

            setTimeout(() => {
                navigateTo(routerNames.signIn)
                clearAllStores()
                clearAllServices()
            }, 0)

            await this.api.signOut({ token });
        } catch (e) {
            console.error(e);
        }
    }

    async inviteUserToOrg(email: string, phone: string, roles: UserRole[], roleIds: string[], attributes: AttributesMap, skills: RequestSkill[], baseUrl: string) {
        return await this.api.inviteUserToOrg(this.orgContext(), email, phone, roles, roleIds, attributes, skills, baseUrl);
    }

    async signUpThroughOrg(orgId: string, pendingId: string, minUser: MinUser) {
        const authTokens = await this.api.signUpThroughOrg(orgId, pendingId, minUser)
        
        try {
            await this.afterSignIn(authTokens);
        } catch (e) {
            console.error(e);
        }
    }

    async updateOrgUsers(userIds?: string[], orgCtx?: OrgContext): Promise<void> {
        const users = await this.api.getTeamMembers(orgCtx || this.orgContext(), userIds);

        const updatedUserMap = {};

        for (const user of users) {
            updatedUserMap[user.id] = user
        }

        runInAction(() => {
            this.users.merge(updatedUserMap);
        })
    }

    async toggleOnDuty() {
        const onDuty = !this.isOnDuty;

        const me = await this.api.setOnDutyStatus(this.orgContext(), onDuty);

        runInAction(() => {
            this.user = me;
        })
    }

    async getLatestMe(prefetched?: { me: ClientSideFormat<Me>, token: string }) {
        try {
            const token = prefetched ? prefetched.token : this.authToken;
            const me = prefetched ? prefetched.me : await this.api.me({ token });

            runInAction(() => {
                this.user = me;

                if (prefetched) {
                    this.authToken = token
                }

                const keys = Object.keys(me.organizations);

                // if called when loading up a logged in user with a previously chosen org context 
                // of an org they are still a member of, honor that org context
                if (!prefetched && !!this.currentOrgId && keys.includes(this.currentOrgId)) {
                    return;
                }

                if (keys.length) {
                    this.currentOrgId = keys[0];
                }
            })
        } catch (e) {
            // TODO: if you get an auth error here we should 
            // make you sign back in
            console.error(e)
        }
    }

    // TODO: remove this as a concept (should change routing to handle userId in route path)
    pushCurrentUser(user: ClientSideFormat<ProtectedUser>) {
        this.currentUser = user;
    }

    async editUser(userId: string, user: Partial<EditableUser>) {
        const updatedUser = await this.api.editUser(this.orgContext(), userId, user)

        runInAction(() => {
            const existingUser = this.users.get(updatedUser.id);

            for (const prop in updatedUser) {
                existingUser[prop] = updatedUser[prop];
            }
        })
    }
    
    async editMe(user: Partial<EditableMe>) {
        const me = await this.api.editMe({ token: this.authToken }, user)

        runInAction(() => {
            this.user = me;

            if (this.currentUser.id == me.id) {
                this.currentUser = me;
            }
        })
    }

    // Still need to keep user for legacy ui data
    // - old Requests they responded to
    // - old chat messages they sent etc.
    // - old assignments
    async removeCurrentUserFromOrg() {
        const { user } = await this.api.removeUserFromOrg(this.orgContext(), this.currentUser.id);
        
        runInAction(() => {
            this.users.set(user.id, user);
            this.currentUser = null
        })
    }
}