import { when } from "mobx";
import { userStore } from "../stores/interfaces";
import { getDB } from "./meta";
import Realm from 'realm';
import { injectable, unmanaged } from "inversify";

export type DBConfiguration = {
    [key in keyof Realm.ConfigurationWithSync]: key extends 'sync' ? Omit<Realm.FlexibleSyncConfiguration, 'user'> : Realm.ConfigurationWithSync[key]
}

@injectable()
export abstract class BaseDB  implements IBaseDB {
    realm: Realm = null;
    
    abstract onInitialized(): Promise<void>

    private realmConfig: Realm.ConfigurationWithSync = null;

    // getting around types + constructor param injections limitations
    abstract dbConfig: DBConfiguration;
    
    async init(): Promise<void> {
        await userStore().init()

        this.realmConfig = this.dbConfig as any;

        if (userStore().signedIn) {
            await this.initAfterSignedIn()
        } else {
            when(() => userStore().signedIn, this.initAfterSignedIn)
        }
    }

    initAfterSignedIn = async () => {
        const realmAppId = 'patch-mljxq' //TODO: come from config
        const realmApp = Realm.App.getApp(realmAppId)

        // const realmCreds = Realm.Credentials.jwt(userStore().authToken)
        const realmCreds = Realm.Credentials.anonymous()
        const realmUser = await realmApp.logIn(realmCreds)

        this.realmConfig.sync.user = realmUser;

        console.log('opening realm')
        this.realm = await Realm.open(this.realmConfig)
        console.log('realm opened')

        when(() => !userStore().signedIn, () => {
            // cleanup?
            when(() => userStore().signedIn, this.initAfterSignedIn)
        })
 
        await this.onInitialized()
    }

    clear(): void {

    }
}

export interface IBaseDB {
    realm: Realm
    init?(): Promise<void>
    clear(): void
}

export interface IOrgUserDB extends IBaseDB {

}

export namespace IOrgUserDB {
    export const id = Symbol('IOrgUserDB');
}