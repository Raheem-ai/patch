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
    
    // Built into visual framework
    backButtonHeader: {
        save: (testId: string) => `${testId} (save)`,
        cancel: (testId: string) => `${testId} (cancel)`,
        minimize: (testId: string) => `${testId} (minimize)`,
        expand: (testId: string) => `${testId} (expand)`,
        labelDecoration: (testId: string, name: string) => `${testId} (${name})`,
    },
    header: {
        menu: 'headerMenu',
        navigation: {
            home: 'headerNavigationHome',
            requests: 'headerNavigationRequests',
            channels: 'headerNavigationChannels',
            team: 'headerNavigationTeam',
            componentLib: 'headerNavigationComponentLib'
        },
        actions: {
            createRequest: 'headerActionsCreateRequest'
        }
    },

    // reuasable component internals
    positionDetailsCard: {
        join: 'positionDetailsCard::join',
        leave: 'positionDetailsCard::leave',
        requestToJoin: 'positionDetailsCard::requestToJoin'
    },
    requestChatChannel: {
        textInput: 'requestChatChannel::textInput',
        reopen: 'requestChatChannel::reopen',
        send: 'requestChatChannel::send',
    },
    categoryRow: {
        wrapper: (testID: string) => `categoryRow(${testID})`,
        toggleOpen: (testID: string) => `${testID}::toggleOpen`,
        label: (testID: string) => `${testID}::label`,
        categoryAction: (testID: string) => `${testID}::categoryAction`,
        footer: (testID: string) => `${testID}::footer`,
        itemRowN: (testID: string, idx: number) => `${testID}::itemRow[${idx}]`,
    },
    tags: {
        deleteN: (testID: string, idx: number) => `${testID}::delete[${idx}]`,
    },
    // TODO: if we need to differentiate between
    // these on different screens we can add a 'context'
    // param on this function and pass a testID to the RequestCard
    // so it can pass that as the 'context' param
    requestCard: (reqId: string) => `requestCard-${reqId}`,
    // can return the field syntax as this isn't using a form internally
    // so we don't have to worry about nesting
    editCategorizedItemForm: {
        wrapper: (testID: string) => `editCategorizedItemForm(${testID})`,
        addCategory: (testID: string) => `${testID}::addCategory`,
        editCategory: (testID: string) => `${testID}::editCategory`,
        addItem: (testID: string) => `${testID}::addItem`,
        editItem: (testID: string) => `${testID}::editItem`,
    },
    editRolesForm: {
        wrapper: (testID: string) => `editRolesForm(${testID})`,
        navInputs: {
            roleOption: (testID: string) => `${testID}::option`,
            roleOptionN: (testID: string, idx: number) => `${testID}::option[${idx}]`,
            addRole: (testID: string) => `${testID}::addRole`
        }
    },
    upsertRolesForm: {
        wrapper: (testID: string) => `upsertRolesForm(${testID})`,
        inputs: {
            permissionGroups: (testID: string) => `${testID}::permissionGroups`,
            name: (testID: string) => `${testID}::name`
        }
    },

    // input internals
    inputs: {
        // TODO: finish this later when we actually use the component
        recurringTimePeriod: {
            wrapper: (testID: string) => `recurringTimePeriod(${testID})`
        },
        mapInput: {
            wrapper: (testID: string) => `mapInput(${testID})`,
            map: (testID: string) => `${testID}::map`,
            marker: (testID: string) => `${testID}::marker`,
            clearText: (testID: string) => `${testID}::clearText`,
            searchText: (testID: string) => `${testID}::searchText`,
            cancel: (testID: string) => `${testID}::cancel`,
            save: (testID: string) => `${testID}::save`,
            suggestionN: (testID: string, idx: number) => `${testID}::suggestion[${idx}]`,
        },
        list: {
            optionN: (testID: string, idx: number) => `${testID}::option[${idx}]`,
        },
        roleList: {
            edit: (testID: string) => `${testID}::edit`
        },
        positions: {
            wrapper: (testID: string) => `positions(${testID})`,
            delete: (testID: string) => `${testID}::delete`,
            inputs: {
                roles: (testID: string) => `${testID}::roles`,
                minMax: (testID: string) => `${testID}::minMax`,
                attributes: (testID: string) => `${testID}::attributes`,
            }
        },
        categorizedItemList: {
            wrapper: (testID: string) => `categorizedItemList(${testID})`,
            edit: (testID: string) => `${testID}::edit`,
            search: (testID: string) => `${testID}::search`,
            searchResultN: (testID: string, idx: number) => `${testID}::searchResult[${idx}]`,
            
            categoryRowN: (testID: string, idx: number) => `${testID}::categoryRowN[${idx}]`,
            pills: (testID: string) => `${testID}::pills`,
        },
        permissionGroupList: {
            wrapper: (testID: string) => `permissionGroupList(${testID})`,
            groupN: (testID: string, idx: number) => `${testID}::group[${idx}]`,
        },
        nestedListInput: {
            wrapper: (testID: string) => `nestedListInput(${testID})`,
            optionN: (testID: string, categoryIdx: number, itemIdx: number) => `${testID}::option[${categoryIdx}][${itemIdx}]`,
        }
    },
    
    // top level screen internals
    landingScreen: {
        signInButton: 'landingScreenSignInButton'
    },
    signIn: {
        email: 'signIn::email',
        password: 'signIn::password',
        submit: 'signIn::submit'
    },
    signUpThroughOrg: {
        screen: 'signUpThroughOrg',
        email: 'signUpThroughOrg::email',
        name: 'signUpThroughOrg::name',
        password: 'signUpThroughOrg::password'
    },
    home: {
        screen: 'homeScreen'
    },
    requestList: {
        screen: 'requestListScreen',
    },
    requestDetails: {
        notes: 'requestDetails::notes',
        tags: 'requestDetails::tags',
        addResponders: 'requestDetails::addResponders',
        notifyPeople: 'requestDetails::notifyPeople',
        closeRequest: 'requestDetails::closeRequest',
        reopenRequest: 'requestDetails::reopenRequest',
    },
    team: {
        screen: 'teamScreen'
    },
    channels: {
        screen: 'channelScreen'
    },
    userHome: {
        goToRequests: 'userHomePage::goToRequests',
        goToChannels: 'userHomePage::goToChannels',
        goToTeam: 'userHomePage::goToTeam',
        linkTo: (link: string) => `userHomePage::linkTo(${link})`,
    },
    welcome: {
        goToSignIn: 'userHomePage::goToSignIn',
        goToSignUps: 'userHomePage::goToSignUps',
    },
    settings: {
        form: 'settingsForm',
        inputs: {
            orgName: 'settingsForm::orgName',
            requestPrefix: 'settingsForm::requestPrefix',
            createRequestChats: 'settingsForm::createRequestChats',
            updatePassword: 'settingsForm::updatePassword'
        },
        navInputs: {
            manageRoles: 'settingsForm::manageRoles',
            manageAttributes: 'settingsForm::manageAttributes',
            manageTags: 'settingsForm::manageTags'
        }
    },

    // BottomDrawer views
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
        removeUser: 'editUserForm::removeUser',
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
        removeUser: 'editMeForm::removeUser',
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
}

export default TestIds;


