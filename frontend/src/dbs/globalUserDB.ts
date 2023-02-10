import { User } from "../../models";
import { BaseDB, DBConfiguration, IGlobalUserDB } from "./interfaces";
import { DB } from "./meta";
import { CategorizedItemSchema, FromSchema, GlobalUserSchema, UserOrgConfigSchema } from "./schemas";

@DB(IGlobalUserDB)
export class GlobalUserDB extends BaseDB implements IGlobalUserDB  {

    dbConfig: DBConfiguration = {
        schema: [GlobalUserSchema, UserOrgConfigSchema, CategorizedItemSchema],
        sync: {
            flexible: true,
            initialSubscriptions: {
                update: (subs, realm) => {
                    console.log(subs, realm)
                    if (!subs.findByName(GlobalUserSchema.name)) {
                        subs.add(realm.objects(GlobalUserSchema.name));
                    }
                },
                rerunOnOpen: true,
              }
        }
    }

    async onInitialized() {
        const collection = this.realm.objects<FromSchema<typeof GlobalUserSchema, User>>(GlobalUserSchema.name)

        console.log(GlobalUserSchema.name, ': ', collection.length)

        for (const user of collection) {
            if (user.email == 'Tevn@test.com'){
                console.log(user.name, user.email, user.password)
                // TODO: users having null organizations (that they were removed from)
                // keeps us from being able to access them (though we can access other properties fine)
                // Error: Exception in HostFunction: No object with key '-91012128431916384' in 'class_user_org_config'
                console.log(user.organizations)
            }
        }
    }

    clear() {

    }
}