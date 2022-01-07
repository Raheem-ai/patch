import { makeAutoObservable, runInAction, when } from 'mobx';
import {  Store } from './meta';
import { ISecretStore, userStore } from './interfaces';
import { securelyPersistent } from '../meta';
import { api } from '../services/interfaces';

@Store(ISecretStore)
export default class SecretStore implements ISecretStore {

    @securelyPersistent()
    googleMapsApiKey: string;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();

        if (userStore().signedIn) {
            await this.fetchSecrets();
        } else {
            when(() => userStore().signedIn, this.fetchSecrets)
        }
    }

    fetchSecrets = async () => {
        const secrets = await api().getSecrets({ token: userStore().authToken });

        runInAction(() => {
            for (const prop in secrets) {
                this[prop] = secrets[prop];
            }
        })

        // handle refetching when signing out and signing back in
        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.fetchSecrets)
        })
    }

    clear() {
        this.googleMapsApiKey = null;
    }
   
}