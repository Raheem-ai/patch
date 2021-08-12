import { injectable } from 'inversify';
import { makeAutoObservable, runInAction } from 'mobx';
import { User } from '../../../common/models';
import API from '../api';
import { Store } from '../di';
import { IUserStore } from '../interfaces';

@Store()
export default class UserStore implements IUserStore {

    public user!: User;

    constructor() {
        makeAutoObservable(this)
    }

    get signedIn() {
        return !!this.user;
    }
    
    async signIn(email: string, password: string) {
        try {
            const user = await API.signIn(email, password)

            if (user) {
                // if already signed in this will not return a user so check to be sure
                runInAction(() => this.user = user)
            }
        } catch (e) {
            // try to handle it here
            // display a pop up error and then make sure to stay on the same component
            console.error(e);
        }
    }

    async signUp(email: string, password: string) {
        try {
            const user = await API.signUp(email, password)
            
            runInAction(() => this.user = user)
        } catch (e) {
            console.error(e);
        }
    }

    async signOut() {
        await API.signOut();
    }
}