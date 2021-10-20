import { injectable } from 'inversify';
import { makeAutoObservable, ObservableMap, runInAction } from 'mobx';
import { Me, ProtectedUser, User, UserRole } from '../../../common/models';
import API from '../api';
import { persistent, Store } from './meta';
import { IUserStore } from './interfaces';
import { ClientSideFormat, OrgContext } from '../../../common/api';
import { navigateTo } from '../navigation';
import { routerNames } from '../types';

@Store()
export default class UserStore implements IUserStore {

    @persistent()
    public user!: ClientSideFormat<Me>;

    @persistent() 
    public authToken!: string;

    @persistent()
    public currentOrgId: string;

    public usersInOrg: ObservableMap<string, ClientSideFormat<ProtectedUser>> = new ObservableMap()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        if (this.signedIn) {
            await this.getLatestMe();
        }
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
            const token = await API.signIn({ email, password })

            const user = await API.me({ token });

            await this.getLatestMe({ me: user, token })
        } catch (e) {
            console.error(e);
        }
    }

    async signUp(email: string, password: string) {
        try {
            const token = await API.signUp({ email, password })

            const user = await API.me({ token });
            
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

            await API.signOut({ token });
        } catch (e) {
            console.error(e);
        }
    }

    async updateOrgUsers(userIds: string[]): Promise<void> {
        const users = await API.getTeamMembers(this.orgContext(), userIds);

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

        const me = await API.setOnDutyStatus(this.orgContext(), onDuty);

        runInAction(() => {
            this.user = me;
        })
    }

    async getLatestMe(prefetched?: { me: ClientSideFormat<Me>, token: string }) {
        try {
            const token = prefetched ? prefetched.token : this.authToken;
            const me = prefetched ? prefetched.me : await API.me({ token });

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