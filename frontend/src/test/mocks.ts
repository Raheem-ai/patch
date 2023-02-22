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
            location: null,
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
        roleDefinitions: DefaultRoles,
        attributeCategories: DefaultAttributeCategories,
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
                    roleIds: [ DefaultRoleIds.Admin, DefaultRoleIds.Dispatcher ],
                    attributes: [
                        { categoryId: DefaultAttributeCategoryIds.Languages, itemId: DefaultAttributeCategoryIds.Languages + Delimiters.Enum + 'lan05'},
                        { categoryId: DefaultAttributeCategoryIds.Languages, itemId: DefaultAttributeCategoryIds.Languages + Delimiters.Enum + 'lan08'},
                        { categoryId: DefaultAttributeCategoryIds.Trainings, itemId: DefaultAttributeCategoryIds.Trainings + Delimiters.Enum + 'train01'}
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