import { makeAutoObservable, ObservableMap, runInAction } from 'mobx';
import { Me, ProtectedUser, UserRole } from '../../../common/models';
import { Store } from './meta';
import { IUserStore } from './interfaces';
import { ClientSideFormat, OrgContext } from '../../../common/api';
import { navigateTo } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';

@Store()
export default class UserStore implements IUserStore {

    private api = getService<IAPIService>(IAPIService)

    @persistent()
    public user!: ClientSideFormat<Me>;

    @persistent() 
    public authToken: string;

    @persistent()
    public currentOrgId: string;

    public usersInOrg: ObservableMap<string, ClientSideFormat<ProtectedUser>> = new ObservableMap()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        if (this.signedIn) {
            // this effectively validates that your refresh token is still valid
            // by calling a method that takes you through the refresh auth flow
            await this.api.init()
            await this.getLatestMe();
        }
    }

    clear() {
        runInAction(() => {
            this.user = null
            this.authToken = null
            this.currentOrgId = null
            this.usersInOrg = new ObservableMap()
        })
    }

    orgContext(): OrgContext {
        return {
            token: this.authToken,
            orgId: this.currentOrgId
        }
    }

    get isOnDuty() {
        if (!this.isResponder) {
            return false;
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
    
    async signIn(email: string, password: string) {
        try {
            const authTokens = await this.api.signIn({ email, password })

            const token = authTokens.accessToken;

            const user = await this.api.me({ token });

            await this.getLatestMe({ me: user, token })
        } catch (e) {
            console.error(e);
        }
    }

    async signUp(email: string, password: string) {
        try {
            const authTokens = await this.api.signUp({ email, password })

            const token = authTokens.accessToken;

            const user = await this.api.me({ token });
            
            await this.getLatestMe({ me: user, token })
        } catch (e) {
            console.error(e);
        }
    }

    async signOut() {
        try {
            const token = this.authToken;

            setTimeout(() => {
                navigateTo(routerNames.signIn)

                runInAction(() => {
                    this.user = null
                    this.authToken = null;
                    this.currentOrgId = null;
                })
            }, 0)

            await this.api.signOut({ token });
        } catch (e) {
            console.error(e);
        }
    }

    async updateOrgUsers(userIds: string[]): Promise<void> {
        const users = await this.api.getTeamMembers(this.orgContext(), userIds);

        const updatedUserMap = {};

        for (const user of users) {
            updatedUserMap[user.id] = user
        }

        runInAction(() => {
            this.usersInOrg.merge(updatedUserMap);
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
}