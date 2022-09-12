import { AppSecrets, AuthTokens, DefaultRoleIds, HelpRequest, Organization, OrganizationMetadata, ProtectedUser, User } from "../../../common/models";

export function MockSecrets(): AppSecrets {
    return {
        googleMapsApiKey: 'xxx-googlemaps-xxx'
    }
}

export function MockRequests(): Partial<HelpRequest>[] {
    return [
        {
            id: 'xxx-req1-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 1',
            displayId: '1',
            dispatcherId: MockUsers()[0].id
        }
    ]
}

export function MockAuthTokens(): AuthTokens {
    return {
        refreshToken: 'xxx-refresh-xxx',
        accessToken: 'xxx-access-xxx'
    }
}

export function MockOrgMetadata(): OrganizationMetadata {
    return {
        name: 'Mock org',
        id: 'xxx-mock-xxx',
        requestPrefix: 'MOCK',
        roleDefinitions: [],
        attributeCategories: [],
        tagCategories: []
    }
}

export function MockUsers(): User[] { 
    return [
        {
            id: '__admin',
            name: 'Admin 1',
            email: 'admin@test.com',
            password: 'pa$$word',
            phone: '555-5555',
            organizations: { 
                [MockOrgMetadata().id]: {
                    roleIds: [ DefaultRoleIds.Admin ],
                    attributes: [],
                    onDuty: false,
                } 
            },
            displayColor: '',
            pronouns: 'they/them',
            bio: '',
        },
        {
            id: '__dispatcher',
            name: 'Dispatcher 2',
            email: 'dispatcher@test.com',
            password: 'pa$$word1',
            phone: '555-5556',
            organizations: { 
                [MockOrgMetadata().id]: {
                    roleIds: [ DefaultRoleIds.Dispatcher ],
                    attributes: [],
                    onDuty: false,
                } 
            },
            displayColor: '',
            pronouns: 'they/them',
            bio: '',
        }
    ]
}