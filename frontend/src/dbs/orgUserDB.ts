import { IOrgUserDB } from "./interfaces";
import Realm from 'realm';
import { userStore } from "../stores/interfaces";
import { when } from "mobx";

export class OrgUserDB implements IOrgUserDB {
    private realm: Realm = null
    
    async init() {
        await userStore().init()

        if (userStore().signedIn) {
            await this.initAfterSignedIn()
        } else {
            when(() => userStore().signedIn, this.initAfterSignedIn)
        }
    }

    initAfterSignedIn = async () => {
        const realmApp = Realm.App.getApp('<from_config>')
        const realmCreds = Realm.Credentials.jwt(userStore().authToken)
        const realmUser = await realmApp.logIn(realmCreds)

        this.realm = await Realm.open({
            schema: null,
            sync: {
                flexible: true,
                user: realmUser,
                initialSubscriptions: {
                    update: (subs, realm) => {
                    //   subs.add(realm.objects('Task'));
                    },
                    rerunOnOpen: true,
                  }
            }
        })

        when(() => !userStore().signedIn, () => {
            // cleanup?
            when(() => userStore().signedIn, this.initAfterSignedIn)
        })
    }

    clear() {

    }
}