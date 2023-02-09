import { BaseDB, DBConfiguration, IOrgUserDB } from "./interfaces";
import { DB } from "./meta";

/**
 * NOTE: fields that don't have '?' at the end of their type will be required
 * such that any document that doesn't have them defined will not be returned
 */
export const OrgUserSchema = {
    // name: 'OrgUser',
    name: 'users',
    properties: {
        _id: 'objectId',
        acceptedTOSVersion: 'string',
        // bio: 'string',
        email: 'string',
        name: 'string',
    },
    primaryKey: '_id',
};
  

@DB(IOrgUserDB)
export class OrgUserDB extends BaseDB implements IOrgUserDB  {

    dbConfig: DBConfiguration = {
        schema: [OrgUserSchema],
        sync: {
            flexible: true,
            initialSubscriptions: {
                update: (subs, realm) => {
                    console.log(subs, realm)
                    if (!subs.findByName(OrgUserSchema.name)) {
                        subs.add(realm.objects(OrgUserSchema.name));
                    }
                },
                rerunOnOpen: true,
              }
        }
    }

    async onInitialized() {
        const collection = this.realm.objects('users')

        console.log(collection.length)

        for (const user of collection) {
            console.log(user)
        }
    }

    clear() {

    }
}