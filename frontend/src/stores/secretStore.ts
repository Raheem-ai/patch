import { makeAutoObservable, runInAction, when } from 'mobx';
import { getStore, Store } from './meta';
import { ISecretStore, IUserStore } from './interfaces';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';
import { securelyPersistent } from '../meta';

@Store()
export default class SecretStore implements ISecretStore {

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)

    @securelyPersistent()
    googleMapsApiKey: string;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await this.userStore.init();

        if (this.userStore.signedIn) {
            await this.fetchSecrets();
        } else {
            when(() => this.userStore.signedIn, this.fetchSecrets)
        }
    }

    fetchSecrets = async () => {
        const secrets = await this.api.getSecrets({ token: this.userStore.authToken });

        runInAction(() => {
            for (const prop in secrets) {
                this[prop] = secrets[prop];
            }
        })

        // handle refetching when signing out and signing back in
        when(() => !this.userStore.signedIn, () => {
            when(() => this.userStore.signedIn, this.fetchSecrets)
        })
    }

    clear() {
        this.googleMapsApiKey = null;
    }
   
}