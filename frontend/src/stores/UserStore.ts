import { injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';
import { Me, User } from '../../../common/models';
import API from '../api';
import { persistent, Store } from './meta';
import { IUserStore } from './interfaces';
import { ClientSideFormat } from '../../../common/api';

@Store()
export default class UserStore implements IUserStore {

    @persistent()
    public user!: ClientSideFormat<Me>;

    @persistent() 
    public authToken!: string;

    @persistent()
    public currentOrgId: string;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        if (this.signedIn) {
            await this.getLatestMe();
        }
    }

    get signedIn() {
        return !!this.user;
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

            runInAction(() => {
                this.user = null
                this.authToken = null;
                this.currentOrgId = null;
            })

            await API.signOut({ token });
        } catch (e) {
            console.error(e);
        }
    }

    async 

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