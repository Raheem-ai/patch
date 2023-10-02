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
        open: {
            close: 'header::close',
            toggleDuty: 'header::toggleDuty',
            onDutyText: 'header::onDutyText',
        },
        closed: {
            status: 'header::statusIcon'
        },
        navigation: {
            home: 'headerNavigationHome',
            requests: 'headerNavigationRequests',
            channels: 'headerNavigationChannels',
            team: 'headerNavigationTeam',
            componentLib: 'headerNavigationComponentLib'
        },
        submenu: {
            profile: 'header::profile',
            settings: 'header::settings',
            helpAndInfo: 'header::helpAndInfo',
            signOut: 'header::signOut',
            helpRequestDetails: 'header::helpRequestDetails'
        },
        actions: {
            createRequest: 'headerActionsCreateRequest',
            editRequest: 'headerActionsEditRequest',
            editProfile: 'headerActionsEditProfile',
            addTeamMember: 'headerActionsAddTeamMember',
            goToHelpRequestList: 'headerActionsGoToHelpRequestList',
            goToHelpRequestMap: 'headerActionsGoToHelpRequestMap'
        },
        availabilityPrompt: {
            cancel: 'header::availabilityPrompt::cancel',
            confirm: 'header::availabilityPrompt::confirm'
        }
    },
    listHeader: {
        toggleHeader: 'listHeader::toggleHeader',
        option: (idx: number, label: string) => `listHeader::option[${idx}]::[${label}]`,
        chosenOption: (idx: number, label: string) => `listHeader::chosenOption[${idx}]::[${label}]`
    },

    // reuasable component internals
    positionCard: {
        wrapper: (testID: string) => `positionsCard(${testID})`,
        roleText: (testID: string) => `${testID}::roleText`,
        attrText: (testID: string, idx: number) => `${testID}::attrText[${idx}]`
    },
    positionDetailsCard: {
        card: 'positionDetailsCard',
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
        itemN: (testID: string, idx: number) => `${testID}::item[${idx}]`,
        deleteN: (testID: string, idx: number) => `${testID}::delete[${idx}]`,
    },
    // TODO: if we need to differentiate between
    // these on different screens we can add a 'context'
    // param on this function and pass a testID to the RequestCard
    // so it can pass that as the 'context' param
    userDetails: {
        screen: `userDetails`
    },
    requestCard: (context: string, reqId: string) => `requestCard::${context}::${reqId}`,
    helpRequestMap: {
        requestCardTrack: 'helpRequestMap::requestCardTrack',
        mapRequestCard: `helpRequestMap::mapRequestCard`,
        mapVisibleRequestCard: `helpRequestMap::mapVisibleRequestCard`,
    },
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
            labelWrapper: (testID: string) => `roleListLabel(${testID})`,
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
            labelWrapper: (testID: string) => `categorizedItemListLabel(${testID})`,
            tagWrapper: (testID: string, categoryId: string) => `categorizedItemListTag(${testID}::${categoryId})`,
            edit: (testID: string) => `${testID}::edit`,
            search: (testID: string) => `${testID}::search`,
            searchResultN: (testID: string, idx: number) => `${testID}::searchResult[${idx}]`,
            searchResultMatchTextN: (testID: string, idx: number) => `${testID}::searchResultMatchText[${idx}]`,
            
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
        },
        textInput: {
            inlineActionIcon: (testID: string) => `textInput::inlineActionIcon(${testID})`
        },
        slider: {
            previewLabel: (testID: string) => `${testID}::slider::previewLabel`,
            minKnob: (testID: string) => `${testID}::slider::minKnob`,
            maxKnob: (testID: string) => `${testID}::slider::maxKnob`
        }
    },
    
    // top level screen internals
    landingScreen: {
        signInButton: 'landingScreenSignInButton'
    },
    sendResetCode: {
        screen: 'sendResetCode',
        cancel: 'sendResetCode::cancel',
        email: 'sendResetCode::email',
        sendLink: 'sendResetCode::sendLink',
    },
    signIn: {
        screen: 'signIn',
        email: 'signIn::email',
        forgot: 'signIn::forgot',
        password: 'signIn::password',
        submit: 'signIn::submit'
    },
    signUpThroughOrg: {
        screen: 'signUpThroughOrg',
        email: 'signUpThroughOrg::email',
        name: 'signUpThroughOrg::name',
        password: 'signUpThroughOrg::password'
    },
    updatePassword: {
        screen: 'updatePassword',
        password: 'password',
        submit: 'submit',
        cancel: 'cancel'
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
        overview: 'requestDetails::overview',
        channel: 'requestDetails::channel',
        team: 'requestDetails::team',
        screen: 'requestDetails::screen',
    },
    tabbedScreen: {
        tabN: (testID: string, idx: number) => `${testID}::tab[${idx}]`
    },
    team: {
        screen: 'teamScreen',
        rowN: (testID: string, idx: number) => `${testID}::row[${idx}]`
    },
    channels: {
        screen: 'channelScreen'
    },
    userHome: {
        screen: 'userHomePage',
        goToRequests: 'userHomePage::goToRequests',
        goToChannels: 'userHomePage::goToChannels',
        goToTeam: 'userHomePage::goToTeam',
        welcomeLabel: 'userHomePage::welcomeLabel',
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
        labels: {
            updatePassword: 'settingsForm::labels::updatePassword'
        },
        navInputs: {
            manageRoles: 'settingsForm::manageRoles',
            manageAttributes: 'settingsForm::manageAttributes',
            manageTags: 'settingsForm::manageTags'
        }
    },
    helpAndInfo: {
        form: 'helpAndInfoForm',
        navInputs: {
            helpCenter: 'helpAndInfoForm::helpCenter',
            fileATicket: 'helpAndInfoForm::fileATicket',
            termsOfUse: 'helpAndInfoForm::termsOfUse',
            privacyPolicy: 'helpAndInfoForm::privacyPolicy'
        }
    },

    // BottomDrawer views
    globalBottomDrawer: 'globalBottomDrawer',
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
        deleteRequest: 'editRequestForm::delete',
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
        deleteAccount: 'editUserForm::deleteAccount',
        inputs: {
            email: 'editUserForm::email',
            phone: 'editUserForm::phone',
            name: 'editUserForm::name',
            bio: 'editUserForm::bio',
            pronouns: 'editUserForm::pronouns',
            roles: 'editUserForm::roles',
            attributes: 'editUserForm::attributes',
        }
    },
    editMe: {
        form: 'editMeForm',
        removeUser: 'editMeForm::removeUser',
        deleteAccount: 'editMeForm::deleteAccount',
        inputs: {
            email: 'editMeForm::email',
            phone: 'editMeForm::phone',
            name: 'editMeForm::name',
            bio: 'editMeForm::bio',
            pronouns: 'editMeForm::pronouns',
            roles: 'editMeForm::roles',
            attributes: 'editMeForm::attributes',
        }
    },
    assignResponders: {
        view: 'assignResponders',
        toggleSelectAllBtn: 'assignResponders::toggleSelectAll',
        toggleSelectAllText: 'assignResponders::toggleSelectAllText',
        selectedRowN: (testID: string, idx: number) => `${testID}::selectedRow[${idx}]`,
        unselectedRowN: (testID: string, idx: number) => `${testID}::unselectedRow[${idx}]`
    },

    // Alert views
    alerts: {
        toast: 'toast',
        prompt: 'prompt'
    },
}

export default TestIds;


