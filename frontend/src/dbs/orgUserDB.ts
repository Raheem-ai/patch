import { BaseDB, DBConfiguration, IOrgUserDB } from "./interfaces";
import { DB } from "./meta";
import { CategorizedItemSchema, OrgUserSchema, UserOrgConfigSchema } from "./schemas";

@DB(IOrgUserDB)
export class OrgUserDB extends BaseDB implements IOrgUserDB  {

    dbConfig: DBConfiguration = {
        schema: [OrgUserSchema, UserOrgConfigSchema, CategorizedItemSchema],
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
        const collection = this.realm.objects(OrgUserSchema.name)

        console.log(OrgUserSchema.name, ': ', collection.length)

        for (const user of collection) {
            console.log(user)
        }
    }
}