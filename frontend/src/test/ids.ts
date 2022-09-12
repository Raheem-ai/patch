const TestIds = {
    expandedFormInput: (testId: string) => `${testId}-expanded`,
    screenInputSaveButton: (testId: string) => `${testId}-save`,
    screenInputCancelButton: (testId: string) => `${testId}-cancel`,
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
        screen: 'requestListScreen'
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