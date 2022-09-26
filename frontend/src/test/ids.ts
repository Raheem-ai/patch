/**
 * 
 * Syntax Key:
 * 
 * Button press of framework level UI components: 
 * - '<context> (semantic action)'
 * 
 * Form (home screen) input fields:
 * - '<context>::field'
 * 
 * Nesting contexts?:
 * - <current context>(<parent context>)
 */
const TestIds = {
    expandedFormInput: (testId: string) => `${testId} (expanded)`,
    
    saveButton: (testId: string) => `${testId} (save)`,
    cancelButton: (testId: string) => `${testId} (cancel)`,
    bottomDrawerMinimizeButton: (testId: string) => `${testId} (minimize)`,
    bottomDrawerExpandButton: (testId: string) => `${testId} (expand)`,
    // TODO: if we need to differentiate between
    // these on different screens we can add a 'context'
    // param on this function and pass a testID to the RequestCard
    // so it can pass that as the 'context' param
    requestCard: (reqId: string) => `requestCard-${reqId}`,
    landingScreen: {
        signInButton: 'landingScreenSignInButton'
    },
    signIn: {
        email: 'signInEmail',
        password: 'signInPassword',
        submit: 'signInSubmit'
    },
    header: {
        menu: 'headerMenu',
        navigation: {
            home: 'headerNavigationHome',
            requests: 'headerNavigationRequests',
            channels: 'headerNavigationChannels',
            team: 'headerNavigationTeam',
        },
        actions: {
            createRequest: 'headerActionsCreateRequest'
        }
    },
    home: {
        screen: 'homeScreen'
    },
    requestList: {
        screen: 'requestListScreen',
    },
    requestDetails: {
        notes: 'requestDetailsNotes'
    },
    team: {
        screen: 'teamScreen'
    },
    channels: {
        screen: 'channelScreen'
    },
    createRequest: {
        form: 'createRequestForm',
        inputs: {
            description: 'createRequestForm::description',
            type: 'createRequestForm::type',
            location: 'createRequestForm::location',
            callStart: 'createRequestForm::callStart',
            callEnd: 'createRequestForm::callEnd',
            callerName: 'createRequestForm::callerName',
            callerContactInfo: 'createRequestForm::callerContactInfo',
            positions: 'createRequestForm::positions',
            priority: 'createRequestForm::priority',
            tags: 'createRequestForm::tags'
        }
    },
    editRequest: {
        form: 'editRequestForm',
        inputs: {
            description: 'editRequestForm::description',
            type: 'editRequestForm::type',
            location: 'editRequestForm::location',
            callStart: 'editRequestForm::callStart',
            callEnd: 'editRequestForm::callEnd',
            callerName: 'editRequestForm::callerName',
            callerContactInfo: 'editRequestForm::callerContactInfo',
            positions: 'editRequestForm::positions',
            priority: 'editRequestForm::priority',
            tags: 'editRequestForm::tags'
        }
    },
    addUser: {
        form: 'addUserForm',
        inputs: {
            email: 'addUserForm::email',
            phone: 'addUserForm::phone',
            role: 'addUserForm::role',
        }
    },
    editUser: {
        form: 'editUserForm',
        inputs: {
            email: 'editUserForm::email',
            phone: 'editUserForm::phone',
            name: 'editMeForm::name',
            bio: 'editMeForm::bio',
            pronouns: 'editMeForm::pronouns',
            roles: 'editUserForm::roles',
            attributes: 'editUserForm::attributes',
        }
    },
    editMe: {
        form: 'editMeForm',
        inputs: {
            email: 'editMeForm::email',
            phone: 'editMeForm::phone',
            name: 'editMeForm::name',
            bio: 'editMeForm::bio',
            pronouns: 'editMeForm::pronouns',
            roles: 'editMeForm::roles',
            attributes: 'editUserForm::attributes',
        }
    },
    assignResponders: {
        view: 'assignResponders'
    },
    // can return the field syntax as this isn't using a form internally
    // so we don't have to worry about nesting
    editCategorizedItemForm: {
        addCategory: (testID: string) => `${testID}::addCategory`,
        editCategory: (testID: string) => `${testID}::editCategory`,
        addItem: (testID: string) => `${testID}::addItem`,
        editItem: (testID: string) => `${testID}::editItem`,
    },
    editRolesForm: {
        wrapper: (testID: string) => `editRolesForm(${testID})`
    },
    upsertRolesForm: {
        wrapper: (testID: string) => `upsertRolesForm(${testID})`,
        inputs: {
            permissionGroups: (testID: string) => `${testID}::permissionGroups`,
            name: (testID: string) => `${testID}::name`
        }
    },
    settings: {
        form: 'settings'
    }
}

export default TestIds;


