import { runInAction, when } from "mobx";
import { userStore } from "../stores/interfaces";
import { getDB } from "./meta";
import Realm from 'realm';
import { injectable, unmanaged } from "inversify";
import { dbNameKey, realmApp } from "./constants";

export type DBConfiguration = {
    [key in keyof Realm.ConfigurationWithSync]: key extends 'sync' ? Omit<Realm.FlexibleSyncConfiguration, 'user'> : Realm.ConfigurationWithSync[key]
}

@injectable()
export abstract class BaseDB  implements IBaseDB {
    realm: Realm = null;
    /**
     * TODO: stores (other than userStore) will synchronize on this vs userStore().signedIn for startup
     * ie:
     * 
     * 
        async init(): Promise<void> {
            await orgUserDB().init()

            if (orgUserDB().ready) {
                await this.initAfterSignedIn()
            } else {
                when(() => userStore().ready, this.initAfterSignedIn)
            }
        }
     * 
     * 
     */
    ready = false;
    
    abstract onInitialized(): Promise<void>

    private realmConfig: Realm.ConfigurationWithSync = null;

    // getting around types + constructor param injections limitations
    abstract dbConfig: DBConfiguration;
    
    async init(): Promise<void> {
        await userStore().init()

        // we extend it later
        this.realmConfig = this.dbConfig as any;

        if (userStore().signedIn) {
            await this.initAfterSignedIn()
        } else {
            when(() => userStore().signedIn, this.initAfterSignedIn)
        }
    }

    private async resolveConfig() {
        // set user 
        this.realmConfig.sync.user = userStore().realmUser;
        
        // handle syncing errors
        this.realmConfig.sync.onError = (_session, error) => {
            console.log(`Sync Error: `, error);
        }

        this.realmConfig.sync.clientReset = {
            mode: Realm.ClientResetMode.RecoverUnsyncedChanges,
            onBefore: (localRealm: Realm) => {

            },
            onAfter: (localRealm: Realm, remoteRealm: Realm) => {

            },
            onFallback: (session: Realm.App.Sync.Session, path: string) => {
                try{
                    // TODO: test this
                    this.realm.close()
                    Realm.deleteFile(this.realmConfig);
                    Realm.App.Sync.initiateClientReset(realmApp, path)
                } catch (e) {
                    console.error(`Error recovering from client reset: `, e)
                }
            }
        }

        // namespace each db
        this.realmConfig.path = this[dbNameKey]
    }

    initAfterSignedIn = async () => {
        console.log('initAfterSignedIn')

        await this.resolveConfig()

        console.log('opening realm')
        this.realm = await Realm.open(this.realmConfig)
        console.log('realm opened')

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.initAfterSignedIn)
        })
 
        console.log('before onInitialize')
        await this.onInitialized()
        console.log('after onInitialize')

        runInAction(() => this.ready = true)
    }

    clear(): void {
        // cleanup?
        // TODO: signing out and back in is causing client reset even though we are closing each realm before
        // calling log out...is this out or order?
        // or maybe i need to have the files namespaced by user id and then delete each file
        // on logout?
        this.realm?.close()
        console.log(this[dbNameKey], ' closed')
    }
}

export interface IBaseDB {
    realm: Realm
    init?(): Promise<void>
    clear(): void
}

export interface IOrgUserDB extends IBaseDB {

}

export interface IGlobalUserDB extends IBaseDB {

}

export namespace IOrgUserDB {
    export const id = Symbol('IOrgUserDB');
}

export namespace IGlobalUserDB {
    export const id = Symbol('IGlobalUserDB');
}

export const AllDBs = [
    IOrgUserDB,
    IGlobalUserDB
]