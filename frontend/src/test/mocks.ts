import { AppSecrets, AuthTokens, DefaultRoleIds, HelpRequest, TeamMemberMetadata, OrganizationMetadata, RequestStatus, User, DefaultRoles, DefaultAttributeCategoryIds, Delimiters, DefaultAttributeCategories } from "../../../common/models";

export function MockSecrets(): AppSecrets {
    return {
        googleMapsApiKey: 'xxx-googlemaps-xxx'
    }
}

export function MockRequests(): HelpRequest[] {
    return [
        {
            id: 'xxx-req1-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 1',
            displayId: '1',
            callerName: '',
            callerContactInfo: '',
            callStartedAt: '',
            callEndedAt: '',
            dispatcherId: MockUsers()[0].id, 
            type: [],
            positions: [],
            tagHandles: [],
            status: RequestStatus.Unassigned,
            teamEvents: [],
            statusEvents: [],
            createdAt: '',
            updatedAt: '',
            location: {
                latitude: 40.69776419999999,
                longitude: -73.9303333,
                address: "960 Willoughby Avenue, Brooklyn, NY, USA"
            },
            priority: null
        },
        {
            id: 'xxx-req2-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 2',
            displayId: '2',
            callerName: '',
            callerContactInfo: '',
            callStartedAt: '',
            callEndedAt: '',
            dispatcherId: MockUsers()[0].id, 
            type: [],
            positions: [],
            tagHandles: [],
            status: RequestStatus.Unassigned,
            teamEvents: [],
            statusEvents: [],
            createdAt: '',
            updatedAt: '',
            location: {
                latitude: 40.70107496314848,
                longitude: -73.90470642596483,
                address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
            },
            priority: null
        },
        {
            id: 'xxx-req3-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 3',
            displayId: '3',
            callerName: '',
            callerContactInfo: '',
            callStartedAt: '',
            callEndedAt: '',
            dispatcherId: MockUsers()[0].id, 
            type: [],
            positions: [],
            tagHandles: [],
            status: RequestStatus.Unassigned,
            teamEvents: [],
            statusEvents: [],
            createdAt: '',
            updatedAt: '',
            location: {
                latitude: 40.69776419999999,
                longitude: -73.9303333,
                address: "960 Willoughby Avenue, Brooklyn, NY, USA"
            },
            priority: null
        },
        {
            id: 'xxx-req4-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 4',
            displayId: '4',
            callerName: '',
            callerContactInfo: '',
            callStartedAt: '',
            callEndedAt: '',
            dispatcherId: MockUsers()[0].id, 
            type: [],
            positions: [],
            tagHandles: [],
            status: RequestStatus.Unassigned,
            teamEvents: [],
            statusEvents: [],
            createdAt: '',
            updatedAt: '',
            location: {
                latitude: 40.70107496314848,
                longitude: -73.90470642596483,
                address: "Seneca Av/Cornelia St, Queens, NY 11385, USA"
            },
            priority: null
        },
        {
            id: 'xxx-req5-xxx',
            orgId: MockOrgMetadata().id,
            notes: 'mock description 5',
            displayId: '5',
            callerName: '',
            callerContactInfo: '',
            callStartedAt: '',
            callEndedAt: '',
            dispatcherId: MockUsers()[0].id, 
            type: [],
            positions: [],
            tagHandles: [],
            status: RequestStatus.Unassigned,
            teamEvents: [],
            statusEvents: [],
            createdAt: '',
            updatedAt: '',
            location: {
                latitude: 40.69776419999999,
                longitude: -73.9303333,
                address: "960 Willoughby Avenue, Brooklyn, NY, USA"
            },
            priority: null
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
        roleDefinitions: JSON.parse(JSON.stringify(DefaultRoles)),
        attributeCategories: JSON.parse(JSON.stringify(DefaultAttributeCategories)),
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
            phone: '5555555555',
            organizations: { 
                [MockOrgMetadata().id]: {
                    roleIds: [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher ],
                    attributes: [
                        { categoryId: DefaultAttributeCategories[0].id, itemId: DefaultAttributeCategories[0].attributes[4].id },
                        { categoryId: DefaultAttributeCategories[0].id, itemId: DefaultAttributeCategories[0].attributes[7].id },
                        { categoryId: DefaultAttributeCategories[2].id, itemId: DefaultAttributeCategories[2].attributes[0].id}
                    ],
                    onDuty: false,
                } 
            },
            displayColor: '',
            pronouns: 'they/them',
            bio: '',
            acceptedTOSVersion: ''
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
            acceptedTOSVersion: ''
        },
        {
            id: '__newuser',
            name: 'New User',
            email: 'newuser@test.com',
            password: 'newpa$$word1',
            phone: '777-5556',
            organizations: {},
            displayColor: '',
            pronouns: 'they/them',
            bio: '',
            acceptedTOSVersion: ''
        }
    ]
}

export function MockTeamMemberMetadata(): TeamMemberMetadata { 
    return { 
        orgMembers: MockUsers(),
        removedOrgMembers: [],
        deletedUsers: []
    }
}