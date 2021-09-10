import { injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';
import { Me, User } from '../../../common/models';
import API from '../api';
import { persistent, Store } from './meta';
import { IUserStore } from './interfaces';

@Store()
export default class UserStore implements IUserStore {

    @persistent()
    public user!: Me;

    @persistent() 
    public authToken!: string;

    constructor() {
        makeAutoObservable(this)
    }

    get signedIn() {
        return !!this.user;
    }
    
    async signIn(email: string, password: string) {
        try {
            const token = await API.signIn({ email, password })

            const user = await API.me(token);

            if (user) {
                runInAction(() => {
                    this.user = user
                    this.authToken = token
                })
            }
        } catch (e) {
            console.error(e);
        }
    }

    async signUp(email: string, password: string) {
        try {
            const token = await API.signUp({ email, password })

            const user = await API.me(token);
            
            runInAction(() => {
                this.user = user
                this.authToken = token
            })
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
            })

            await API.signOut(token);
        } catch (e) {
            console.error(e);
        }
    }
}