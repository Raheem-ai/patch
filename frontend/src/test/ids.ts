const TestIds = {
    expandedFormInput: (testId: string) => `${testId}-expanded`,
    screenInputSaveButton: (testId: string) => `${testId}-save`,
    screenInputCancelButton: (testId: string) => `${testId}-cancel`,
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
        submit: 'createRequestFormSubmit',
        description: 'createRequestFormDescription'
    }
}

export default TestIds;