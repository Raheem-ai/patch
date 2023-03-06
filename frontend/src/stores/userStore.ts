import { makeAutoObservable, ObservableMap, ObservableSet, runInAction } from 'mobx';
import { AuthTokens, EditableMe, Me, MinUser, AdminEditableUser, ProtectedUser, UserRole, CategorizedItem, User, BasicCredentials } from '../../../common/models';
import { Store } from './meta';
import { alertStore, appUpdateStore, IUserStore, navigationStore } from './interfaces';
import { ClientSideFormat, OrgContext } from '../../../common/api';
import { navigateTo } from '../navigation';
import { RootStackParamList, routerNames } from '../types';
import { persistent } from '../meta';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';
import { clearAllStores } from './utils';
import { clearAllServices } from '../services/utils';
import { termsOfServiceLink, termsOfServiceVersion } from '../config';
import { resolveErrorMessage } from '../errors';
import { termsOfServicePrompt } from './promptUtils';
import { Linking } from 'react-native';
import { clearAllDBs } from '../dbs/utils';
import { realmApp } from '../dbs/constants';

@Store(IUserStore)
export default class UserStore implements IUserStore {

    private api = getService<IAPIService>(IAPIService)

    @persistent()
    user!: ClientSideFormat<Me>;

    realmUser: Realm.User;

    @persistent() 
    authToken: string;

    @persistent()
    currentOrgId: string;

    passwordResetLoginCode = null;
    loadingCurrentUser = false;

    currentUserId: string;

    users: ObservableMap<string, ClientSideFormat<ProtectedUser>> = new ObservableMap()
    deletedUsers: ObservableSet<string> = new ObservableSet()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await appUpdateStore().init()
        await alertStore().init()

        if (this.signedIn) {
            // make sure this doesn't throw because any store that depends on the user store
            // won't get initialized when there is a stale refreshToken
            try {
                // wait for api to init so its persistent state can settle
                // before relying on it to handle the refresh token auth flow
                await this.api.init();

                // If any of these fail because of a stale refreshToken, api() will handle calling this.onSignOut() 
                // which will clear all stores and reroute to the correct screen
                await this.updateOrgUsers([]);

                await this.loginToRealm(this.api.refreshToken)

                await this.getLatestMe();

                this.checkTOS();

            } catch (e) {
                console.error(e)
            }
        }
    }

    clear() {
        this.user = null
        this.authToken = null
        this.currentOrgId = null
        this.users = new ObservableMap()
        this.passwordResetLoginCode = null
        this.deletedUsers = new ObservableSet()
    }

    checkTOS = () => {
        if (termsOfServiceVersion != this.user.acceptedTOSVersion) {
            this.promptTOS()
        }
    }

    promptTOS = () => {
        alertStore().showPrompt(termsOfServicePrompt(
            () => {
                this.signOut();
            },
            async () => {
                try {
                    await this.editMe({
                        acceptedTOSVersion: termsOfServiceVersion,
                    })
                } catch (e) {
                    alertStore().toastError(resolveErrorMessage(e))
                }
            },
            () => {
                Linking.openURL(termsOfServiceLink)
            }
        ))
    }

    orgContext(token?: string): OrgContext {
        return {
            token: token || this.authToken,
            orgId: this.currentOrgId
        }
    }

    userInOrg = (user: Pick<User, 'organizations'>) => {
        return !!user.organizations[this.currentOrgId]
    }

    get currentUser(): ClientSideFormat<ProtectedUser> {
        return this.users.get(this.currentUserId);
    }

    get usersInOrg() {
        return Array.from(this.users.values())
            .filter(this.userInOrg)
    }

    get usersRemovedFromOrg() {
        return Array.from(this.users.values())
            .filter(u => !this.userInOrg(u))
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

        await this.loginToRealm(authTokens.refreshToken)

        await this.getLatestMe({ me: user, token })

        this.checkTOS()
    }

    async loginToRealm(refreshToken: string) {
        // set up realm user before unlocking dbs
        const realmUser = await realmApp.logIn(Realm.Credentials.jwt(refreshToken))

        const existingUsers = realmApp.allUsers;

        // TODO: move this to onsignout
        for (const user of Object.values(existingUsers)) {
            if (user.id != realmUser.id) {
                // remove data about any user not signed in
                realmApp.removeUser(user)
            }
        }

        runInAction(() => this.realmUser = realmUser)
    }
    
    async signIn(email: string, password: string) {
        const authTokens = await this.api.signIn({ email, password })
        await this.afterSignIn(authTokens);
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

            setTimeout(this.onSignOut, 0)

            await this.api.signOut({ token });
        } catch (e) {
            console.error(e);
        }
    }

    async deleteMyAccount() {
        await this.api.deleteMyAccount({ token: this.authToken })
        this.onSignOut()
    }

    /**
     * Code that should be run whenever a user logs out or is logged out
     * by the system.
     * 
     * NOTE: should not have a reference to 'this' as this may be called before 
     * this.init() resolves ie. stale refresh token flow
     */
    onSignOut = (route?: keyof RootStackParamList) => {
        navigateTo(route || routerNames.landing)
        clearAllStores()
        clearAllServices()
        clearAllDBs()

        // TODO: do we need to wait on this?
        console.log(this.realmUser.id)
        this.realmUser?.logOut()
        console.log('logged out')
    }

    async inviteUserToOrg(email: string, phone: string, roleIds: string[], attributes: CategorizedItem[], baseUrl: string) {
        return await this.api.inviteUserToOrg(this.orgContext(), email, phone, roleIds, attributes, baseUrl);
    }

    async signUpThroughOrg(orgId: string, pendingId: string, minUser: MinUser) {
        const authTokens = await this.api.signUpThroughOrg(orgId, pendingId, minUser)        
        await this.afterSignIn(authTokens);
    }

    async updatePassword(password: string) {
        const token = this.authToken;
        await this.api.updatePassword( {token}, password, this.passwordResetLoginCode);
        this.passwordResetLoginCode = null;
    }

    async sendResetCode(email: string, baseUrl: string) {
        await this.api.sendResetCode(email, baseUrl)        
    }

    async signInWithCode(code: string) {
        const authTokens = await this.api.signInWithCode(code)
        await this.afterSignIn(authTokens);
    }

    async updateOrgUsers(userIds?: string[], orgCtx?: OrgContext): Promise<void> {
        const userMetadata = await this.api.getTeamMembers(orgCtx || this.orgContext(), userIds);

        const updatedUserMap = {};

        for (const user of userMetadata.orgMembers) {
            updatedUserMap[user.id] = user
        }

        for (const user of userMetadata.removedOrgMembers) {
            updatedUserMap[user.id] = user
        }

        runInAction(() => {
            this.users.merge(updatedUserMap);
            
            userMetadata.deletedUsers.forEach(id => this.deletedUsers.add(id))
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
    }

    // TODO: remove this as a concept (should change routing to handle userId in route path)
    pushCurrentUser(user: ClientSideFormat<ProtectedUser>) {
        this.currentUserId = user.id;
    }

    async editUser(userId: string, user: Partial<AdminEditableUser>) {
        const updatedUser = await this.api.editUser(this.orgContext(), userId, user)

        runInAction(() => {
            const existingUser = this.users.get(updatedUser.id);

            for (const prop in updatedUser) {
                existingUser[prop] = updatedUser[prop];
            }
        })
    }
    
    async editMe(user: Partial<EditableMe>, protectedUser?: Partial<AdminEditableUser>) {
        const me = await this.api.editMe(this.orgContext(), user, protectedUser || {})

        runInAction(() => {
            this.user = me;

            // TODO: not totally sure why this is needed?
            if (this.currentUser?.id == me.id) {
                this.currentUserId = me.id;
            }
        })

        await this.updateOrgUsers([me.id])
    }

    // Still need to keep user for legacy ui data
    // - old Requests they responded to
    // - old chat messages they sent etc.
    // - old assignments
    async removeCurrentUserFromOrg() {
        const { user } = await this.api.removeUserFromOrg(this.orgContext(), this.currentUser.id);
        
        runInAction(() => {
            this.users.set(user.id, user);
            this.currentUserId = null
        })
    }

    async removeMyselfFromOrg() {
        const { user } = await this.api.removeUserFromOrg(this.orgContext(), this.currentUser.id);
        await this.api.signOut({ token: this.authToken });

        await navigationStore().navigateToSync(routerNames.signIn);

        setTimeout(() => {
            clearAllStores()
            clearAllServices()
            clearAllDBs()
        }, 0)
    }
}