import { BaseDB, IOrgUserDB } from "./interfaces";
import Realm from 'realm';
import { userStore } from "../stores/interfaces";
import { when } from "mobx";
import { DB } from "./meta";

export const OrgUserSchema = {
    name: 'OrgUser',
    properties: {
        _id: 'objectId',
        acceptedTOSVersion: 'string',
        auth_etag: 'string',
        bio: 'string',
        email: 'string',
        name: 'string',
    },
    primaryKey: '_id',
};
  

@DB(IOrgUserDB)
export class OrgUserDB extends BaseDB implements IOrgUserDB  {

    constructor() {
        super({
            schema: [OrgUserSchema],
            sync: {
                flexible: true,
                initialSubscriptions: {
                    update: (subs, realm) => {
                        console.log(subs)
                    //   subs.add(realm.objects('Task'));
                    },
                    rerunOnOpen: true,
                  }
            }
        })
    }

    clear() {

    }
}