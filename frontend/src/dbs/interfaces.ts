import { when } from "mobx";
import { userStore } from "../stores/interfaces";
import { getDB } from "./meta";
import Realm from 'realm';

export type DBConfiguration = {
    [key in keyof Realm.ConfigurationWithSync]: key extends 'sync' ? Omit<Realm.FlexibleSyncConfiguration, 'user'> : Realm.ConfigurationWithSync[key]
}

export abstract class BaseDB  implements IBaseDB {
    realm: Realm = null;
    private realmConfig: Realm.ConfigurationWithSync = null;

    constructor(
        dbConfig: DBConfiguration
    ) { 
        this.realmConfig = dbConfig as any;
        dbConfig
    }
    
    async init(): Promise<void> {
        await userStore().init()

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

        this.realm = await Realm.open(this.realmConfig)

        when(() => !userStore().signedIn, () => {
            // cleanup?
            when(() => userStore().signedIn, this.initAfterSignedIn)
        })
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