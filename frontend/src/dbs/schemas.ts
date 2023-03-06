/**
 * NOTE: fields that don't have '?' at the end of their type will be required
 * such that any document that doesn't have them defined will not be returned
 */

///////////////////////////////////////
// Helper (embedded) schemas
///////////////////////////////////////

export const CategorizedItemSchema = {
    name: 'categorized_item',
    embedded: true,
    properties: {
        categoryId: 'string',
        itemId: 'string'
    }
}

export const UserOrgConfigSchema = {
    name: 'user_org_config',
    embedded: true,
    properties: {
        roleIds: 'string[]',
        attributes: `${CategorizedItemSchema.name}[]`,
        onDuty: 'bool?'
    }
}

export type FromSchema<Schema extends { properties: any }, T> = {
    [key in keyof Schema['properties']]: T[key]
}

///////////////////////////////////////
// Top level schemas for DBs
///////////////////////////////////////

export const GlobalUserSchema = {
    name: 'users',
    properties: {
        _id: 'objectId',
        email: 'string',
        name: 'string',
        password: 'string',
        organizations: `${UserOrgConfigSchema.name}{}?`,
        acceptedTOSVersion: 'string?',
        bio: 'string?',
        phone: 'string?',
        race: 'string?',
        pronouns: 'string?',
    },
    primaryKey: '_id',
};

export const OrgUserSchema = {
    name: 'org_users',
    properties: Object.assign({}, GlobalUserSchema.properties, {
        orgId: 'string'
    }),
    primaryKey: '_id',
};


/**
 * {
  "rules": {},
  "defaultRoles": [
    {
      "name": "default",
      "applyWhen": {},
      "read": true,
      "write": true
    }
  ]
}
 */