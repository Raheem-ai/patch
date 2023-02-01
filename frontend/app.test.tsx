import { render, fireEvent, waitFor, act, cleanup, waitForElementToBeRemoved } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

jest.mock('expo-constants', () => {
    const originalModule = jest.requireActual('expo-constants');

    originalModule.default.manifest.extra = {
        apiHost: '',
        sentryDSN: '',
        appEnv: 'dev',
        backendEnv: '',
        linkBaseUrl: '',
        termsOfServiceVersion: '',
        termsOfServiceLink: ''
    }
  
    //Mock the default export and named export 'foo'
    return {
      __esModule: true,
      ...originalModule,
    };
});

import App from './App';
import {hideAsync} from 'expo-splash-screen';
import boot from './src/boot';
import TestIds from './src/test/ids';
import {APIClient} from './src/api'
import { MockAuthTokens, MockOrgMetadata, MockRequests, MockSecrets, MockTeamMemberMetadata, MockUsers } from './src/test/mocks';
import { headerStore, linkingStore, navigationStore } from './src/stores/interfaces';
import { routerNames } from './src/types';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
// import PersistentStorage, { PersistentPropConfigs } from './src/meta/persistentStorage';
// import { StorageController } from 'mobx-persist-store';
import { AppState } from 'react-native';
import MockedSocket from 'socket.io-mock';
import { clearAllStores } from './src/stores/utils';
import { clearAllServices } from './src/services/utils';
import * as commonUtils from '../common/utils';
import { LinkExperience, LinkParams, MinUser } from '../common/models';
import STRINGS from '../common/strings';
import Branch, { BranchSubscriptionEvent } from 'react-native-branch';

// // TODO: maybe these need to be put into the beforeEach so all mocks can be safely reset each time
jest.mock('./src/boot')
jest.mock('expo-splash-screen')
jest.mock('./src/meta/persistentStorage')

const originalBoot = jest.requireActual('./src/boot').default;
const { hideAsync: originalHideAsync } = jest.requireActual('expo-splash-screen');
const appStateMock = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => null)

// // const mockedPersistentStorage = PersistentStorage as jest.MaybeMockedConstructor<StorageController>;
// // mockedPersistentStorage.mockImplementation(function (secureKeys: string[], propConfigs: PersistentPropConfigs) { return mockAsyncStorage })


jest.mock('./src/meta/persistentStorage', () => {
    const originalModule = jest.requireActual('./src/meta/persistentStorage');
  
    //Mock the default export and named export 'foo'
    return {
      __esModule: true,
      ...originalModule,
      default: () => mockAsyncStorage,
    };
});

jest.mock('socket.io-client', () => {
    const originalModule = jest.requireActual('socket.io-client');
    const EventEmitter = jest.requireActual('react-native').EventEmitter;
  
    return {
      __esModule: true,
      ...originalModule,
      io: jest.fn().mockImplementation(() => {
        const mockSocket = new MockedSocket()

        mockSocket.io = new EventEmitter()

        return mockSocket
      })
    };
});

async function mockBoot() {
    const mockedBoot = boot as jest.MaybeMocked<typeof boot>;
    const mockedHideAsync = hideAsync as jest.MaybeMocked<typeof hideAsync>;

    mockedHideAsync.mockImplementation(originalHideAsync);

    const bootup = new Promise<void>((resolve) => {
        mockedBoot.mockImplementation((doneLoading: (() => void)) => {
            return originalBoot(() => {
                // console.log('UNLOCKING AFTER MOCK BOOTUP')
                act(doneLoading)
                resolve()
            })
        })
    });

    const utils = render(<App/>);
    
    await bootup;

    return utils
}

async function mockLinkBoot<Experience extends LinkExperience>(exp: Experience, linkParams: LinkParams[Experience]) {
    // mock out changes to the Branch.subscribe in linkingStore().init()
    const domain = 'www.test.com'
    const queryString = Object.keys(linkParams).map(paramName => `&${paramName}=${linkParams[paramName]}`).join('')
    const link = `${domain}?exp=${exp}${queryString}`
    const branchEvent: BranchSubscriptionEvent = {
        error: null,
        uri: domain,
        params: { 
            "+match_guaranteed": true,
            "+is_first_session": true,
            "+clicked_branch_link": true,
            "~referring_link": link
        }
    };

    const branchSubscribeMock = jest.spyOn(Branch, 'subscribe').mockImplementationOnce((callback: ((event: BranchSubscriptionEvent) => (() => void))) => {
        return callback(branchEvent)
    });

    const mockedUser = MockUsers()[0];

    // mock out the api calls that will get triggered when the app
    const getMeMock = jest.spyOn(APIClient.prototype, 'me').mockResolvedValue(mockedUser);

    const { getByTestId, ...rest } = await mockBoot();
    return {
        getByTestId,
        getMeMock,
        branchSubscribeMock,
        ...rest
    }
}

async function mockSignIn() {
    const { getByTestId, ...rest } = await mockBoot();

    // TODO: reenable when we use the landing screen again
    // const signInButton = await waitFor(() => getByTestId(TestIds.landingScreen.signInButton))

    // await act(async () => {
    //     fireEvent(signInButton, 'click');
    // })
   
    const emailInput = await waitFor(() => getByTestId(TestIds.signIn.email))
    const passwordInput = await waitFor(() => getByTestId(TestIds.signIn.password)) 
    const submitButton = await waitFor(() => getByTestId(TestIds.signIn.submit))

    const mockedUser = MockUsers()[0];
    
    await act(async () => {
        fireEvent.changeText(emailInput, mockedUser.email)
        fireEvent.changeText(passwordInput, mockedUser.password)
    })

    const response = {
        // mocked apis
        signInMock: jest.spyOn(APIClient.prototype, 'signIn').mockResolvedValue(MockAuthTokens()),
        getMeMock: jest.spyOn(APIClient.prototype, 'me').mockResolvedValue(mockedUser),
        getTeamMembersMock: jest.spyOn(APIClient.prototype, 'getTeamMembers').mockResolvedValue(MockTeamMemberMetadata()),
        getOrgMetadataMock: jest.spyOn(APIClient.prototype, 'getOrgMetadata').mockResolvedValue(MockOrgMetadata()),
        getOrgSecretsMock: jest.spyOn(APIClient.prototype, 'getSecrets').mockResolvedValue(MockSecrets()),
        getRequestsMock: jest.spyOn(APIClient.prototype, 'getRequests').mockResolvedValue([]),

        // mocked data
        mockedUser,

        // utils
        getByTestId,
        ...rest
    }

    await act(async () => {
        fireEvent(submitButton, 'click')
    })

    return response;
}

describe('Boot Scenarios', () => {

    // afterEach(cleanup)

    test('Waits for stores to load to hide the Splash Screen', async () => {
        render(<App/>);
        expect(hideAsync).not.toHaveBeenCalled();
    });

    test('Hides the Splash Screen and shows the landing page after stores load', async () => {
        const { getByTestId, toJSON } = await mockBoot();

        expect(hideAsync).toHaveBeenCalled();

        // expect(toJSON()).toMatchSnapshot();

        // TODO: reenable when we use the landing screen again
        // await waitFor(() => getByTestId(TestIds.landingScreen.signInButton))
        await waitFor(() => getByTestId(TestIds.signIn.submit))
    });
})

describe('Join or Sign Up from Invitation Scenarios', () => {

    afterEach(() => {
        // TODO: Something incomplete about the cleanup process because
        // "Signed in Scenarios" fail if they're executed after these.
        cleanup()
        clearAllStores()
        clearAllServices()
    })

    async function successfulSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
        const mockedUser = MockUsers()[0];
        const linkParams: LinkParams[Experience] = {
            orgId: MockOrgMetadata().id,
            pendingId: 'xxxx',
            email: mockedUser.email
        };

        const {
            getByTestId,
            getMeMock,
            branchSubscribeMock,
            toJSON,
            ...rest
        } = await mockLinkBoot(exp, linkParams);

        // After boot from link, app should navigate to signUpThroughOrg page
        await waitFor(() => {
            expect(linkingStore().initialRoute).toEqual(routerNames.signUpThroughOrg);
        })

        await waitFor(() => {
            expect(linkingStore().initialRouteParams).toEqual(linkParams);
        })

        const signUpThroughOrgPage = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.screen));
        const joinButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.signUpThroughOrg.screen)));
        
        const nameInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.name));
        const emailInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.email));
        const passwordInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.password));

        // Join button should be disabled until the form fields are filled.
        expect(joinButton).toBeDisabled();

        // Users should only be able to edit their name and password on this screen.
        // i.e. the email text box should be disabled with the email of the mocked user.
        expect(emailInput.props.editable).toBe(false);
        expect(emailInput.props.value).toBe(mockedUser.email);

        // Fill out user info with mocked data.
        await act(async () => {
            fireEvent.changeText(nameInput, mockedUser.name)
            fireEvent.changeText(passwordInput, mockedUser.password)
        })

        // Join button should be enabled after filling out form.
        expect(joinButton).not.toBeDisabled();

        // mocked apis
        const signUpThroughOrgMock = jest.spyOn(APIClient.prototype, 'signUpThroughOrg').mockResolvedValue(MockAuthTokens());
        const getTeamMembersMock = jest.spyOn(APIClient.prototype, 'getTeamMembers').mockResolvedValue(MockTeamMemberMetadata());
        const getOrgMetadataMock = jest.spyOn(APIClient.prototype, 'getOrgMetadata').mockResolvedValue(MockOrgMetadata());
        const getOrgSecretsMock = jest.spyOn(APIClient.prototype, 'getSecrets').mockResolvedValue(MockSecrets());
        const getRequestsMock = jest.spyOn(APIClient.prototype, 'getRequests').mockResolvedValue([]);

        // Submit the form
        await act(async () => {
            fireEvent(joinButton, 'click')
        })

        // After signup, user app should reroute to the userHomePage
        await waitFor(() => {
            expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage);
        })

        await waitFor(() => {
            expect(signUpThroughOrgMock).toHaveBeenCalledWith(linkParams.orgId, linkParams.pendingId, {
                email: mockedUser.email,
                name: mockedUser.name,
                password: mockedUser.password
            })
        })

        await waitFor(() => {
            expect(getMeMock).toHaveBeenCalledWith({
                token: MockAuthTokens().accessToken
            })
        })

        await waitFor(() => {
            expect(getTeamMembersMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                },
                []
            )
        })

        await waitFor(() => {
            expect(getOrgMetadataMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                }
            )
        })

        await waitFor(() => {
            expect(getOrgSecretsMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken
                }
            )
        })

        await waitFor(() => {
            expect(getRequestsMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                },
                []
            )
        })

        await waitFor(() => getByTestId(TestIds.home.screen));

        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(`Welcome to PATCH!`)

        // TODO: import {parseFullName} from 'parse-full-name';
        const userHomeWelcomeLabel = await waitFor(() => getByTestId(TestIds.userHome.welcomeLabel));
        expect(userHomeWelcomeLabel).toHaveTextContent(`Hi, Admin.`);
    }

    async function badLinkParamsSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
        // mock around params for link
        const linkParams: LinkParams[Experience] = {
            orgId: '',
            pendingId: '',
            email: ''
        };

        const {
            getByTestId,
            getMeMock,
            branchSubscribeMock,
            toJSON,
            ...rest
        } = await mockLinkBoot(exp, linkParams);

        // TODO: Which screen do we expect to be on here?
        await waitFor(() => {
            expect(linkingStore().initialRoute).toBeNull();
        });

        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));

        const expectedError = exp == LinkExperience.SignUpThroughOrganization ? STRINGS.LINKS.errorMessages.badSignUpThroughOrgLink() : STRINGS.LINKS.errorMessages.badJoinOrgLink();
        expect(toastTextComponent).toHaveTextContent(expectedError);
    }

    async function backendErrorSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
        // Mock signUpThroughOrg API to throw an error
        jest.spyOn(APIClient.prototype, 'signUpThroughOrg').mockImplementationOnce((orgId: string, pendingId: string, minUser: MinUser) => {
            throw new Error(STRINGS.ACCOUNT.inviteNotFound(linkParams.email, linkParams.orgId));
        });

        const mockedUser = MockUsers()[0];

        // mock around params for link
        const linkParams: LinkParams[Experience] = {
            orgId: MockOrgMetadata().id,
            pendingId: 'xxxx',
            email: mockedUser.email
        };

        const {
            getByTestId,
            getMeMock,
            branchSubscribeMock,
            toJSON,
            ...rest
        } = await mockLinkBoot(exp, linkParams);

        // After boot from link, app should navigate to signUpThroughOrg page
        await waitFor(() => {
            expect(linkingStore().initialRoute).toEqual(routerNames.signUpThroughOrg);
        })

        await waitFor(() => {
            expect(linkingStore().initialRouteParams).toEqual(linkParams);
        })

        const signUpThroughOrgPage = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.screen));
        const joinButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.signUpThroughOrg.screen)));
        
        const nameInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.name));
        const emailInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.email));
        const passwordInput = await waitFor(() => getByTestId(TestIds.signUpThroughOrg.password));

        // Join button should be disabled until the form fields are filled.
        expect(joinButton).toBeDisabled();

        // Users should only be able to edit their name and password on this screen.
        // i.e. the email text box should be disabled with the email of the mocked user.
        expect(emailInput.props.editable).toBe(false);
        expect(emailInput.props.value).toBe(linkParams.email);

        // Fill out user info with mocked data.
        await act(async () => {
            fireEvent.changeText(nameInput, mockedUser.name)
            fireEvent.changeText(passwordInput, mockedUser.password)
        })

        // Join button should be enabled after filling out form.
        expect(joinButton).not.toBeDisabled();

        // Submit the form
        await act(async () => {
            fireEvent(joinButton, 'click')
        })

        // User should still be on signUpThroughOrg screen
        await waitFor(() => getByTestId(TestIds.signUpThroughOrg.screen));

        // Expect a toast alert with the message contents from the API error to display  
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.ACCOUNT.inviteNotFound(linkParams.email, linkParams.orgId));
    }

    test('Successful sign up through org, navigate to home page', async () => {
        console.log('Sign Up - Successful run')
        await successfulSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Open app with bad sign up link params, show error toast', async () => {
        console.log('Sign Up - Bad link params run')
        await badLinkParamsSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Backend sign up error, show toast', async () => {
        console.log('Sign Up - Backend error run')
        await backendErrorSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Successful join org, navigate to home page', async () => {
        console.log('Join Org - Successful run')
        await successfulSignUpOrJoin(LinkExperience.JoinOrganization);
    })

    test('Open app with bad join org link params, show error toast', async () => {
        console.log('Join Org - Bad link params run')
        await badLinkParamsSignUpOrJoin(LinkExperience.JoinOrganization);
    })

    test('Backend join organization error, show toast', async () => {
        console.log('Join Org - Backend error run')
        await backendErrorSignUpOrJoin(LinkExperience.JoinOrganization);
    })

    test('Open app with bad link experience, show error toast', async () => {
        console.log('Sign Up - Bad link exp run')
        const mockedUser = MockUsers()[0];

        // mock around params for link
        const linkParams: LinkParams[LinkExperience.SignUpThroughOrganization] = {
            orgId: MockOrgMetadata().id,
            pendingId: 'xxxx',
            email: mockedUser.email
        };

        // Pass empty string as the LinkExperience to cause error
        const {
            getByTestId,
            getMeMock,
            branchSubscribeMock,
            toJSON,
            ...rest
        } = await mockLinkBoot('' as LinkExperience, linkParams);

        await waitFor(() => {
            expect(linkingStore().initialRoute).toBeNull();
        });

        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.LINKS.errorMessages.unknownLink());
    })
})

describe('Signed in Scenarios', () => {
    afterEach(() => {
        cleanup()
        clearAllStores()
        clearAllServices()
    })

    test('Stores fetch initial data after sign in and route to homepage', async () => {
        const {
            signInMock,
            getMeMock,
            getTeamMembersMock,
            getOrgMetadataMock,
            getOrgSecretsMock,
            getRequestsMock,
            getByTestId,
            mockedUser
        } = await mockSignIn()

        await waitFor(() => {
            expect(signInMock).toHaveBeenCalledWith({
                email: mockedUser.email,
                password: mockedUser.password
            })
        })

        await waitFor(() => {
            expect(getMeMock).toHaveBeenCalledWith({
                token: MockAuthTokens().accessToken
            })
        })

        await waitFor(() => {
            expect(getTeamMembersMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                },
                []
            )
        })

        await waitFor(() => {
            expect(getOrgMetadataMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                }
            )
        })

        await waitFor(() => {
            expect(getOrgSecretsMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken
                }
            )
        })

        await waitFor(() => {
            expect(getRequestsMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                },
                []
            )
        })

        await waitFor(() => getByTestId(TestIds.home.screen));
    });

    test('Can create request after login', async () => {
        const {
            getByTestId,
            mockedUser,
            toJSON,
            getOrgMetadataMock,
            signInMock
        } = await mockSignIn()

        await waitFor(() => {
            expect(signInMock).toHaveBeenCalledWith({
                email: mockedUser.email,
                password: mockedUser.password
            })
        })

        const mockOrgContext = {
            token: MockAuthTokens().accessToken,
            orgId: MockOrgMetadata().id
        };

        await waitFor(() => {
            expect(getOrgMetadataMock).toHaveBeenCalledWith(mockOrgContext)
        })

        await waitFor(() => getByTestId(TestIds.home.screen));

        const openHeaderButton = await waitFor(() => getByTestId(TestIds.header.menu));

        await act(async() => {
            fireEvent(openHeaderButton, 'click')
        })

        const navToRequestButton = await waitFor(() => getByTestId(TestIds.header.navigation.requests));

        fireEvent(navToRequestButton, 'press')

        await waitFor(() => {
            return !headerStore().isOpen && navigationStore().currentRoute == routerNames.helpRequestList
        });

        await waitFor(() => {
            return getByTestId(TestIds.requestList.screen)
        });

        const mockRightNow = () => { return '2:30 PM' };

        jest.spyOn(commonUtils, 'rightNow').mockImplementation(mockRightNow)

        const createRequestButton = await waitFor(() => getByTestId(TestIds.header.actions.createRequest))

        await act(async() => {
            fireEvent(createRequestButton, 'press')
        })

        await waitFor(() => getByTestId(TestIds.createRequest.form));
        
        let createRequestSubmitButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.createRequest.form)));

        expect(createRequestSubmitButton).toBeDisabled();

        const descriptionInputLabel = await waitFor(() => getByTestId(TestIds.createRequest.inputs.description));

        await act(async() => {
            fireEvent(descriptionInputLabel, 'press')
        })

        const descriptionInput = await waitFor(() => getByTestId(TestIds.expandedFormInput(TestIds.createRequest.inputs.description)));

        const mockRequest = MockRequests()[0];

        await act(async() => {
            fireEvent.changeText(descriptionInput, mockRequest.notes)
        })

        const saveDescriptionButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.createRequest.inputs.description)));

        await act(async() => {
            fireEvent(saveDescriptionButton, 'press')
        })

        await waitForElementToBeRemoved(() => getByTestId(TestIds.backButtonHeader.save(TestIds.createRequest.inputs.description)));

        expect(createRequestSubmitButton).not.toBeDisabled();

        const createNewRequestMock = jest.spyOn(APIClient.prototype, 'createNewRequest').mockResolvedValue(mockRequest)

        await act(async() => {
            fireEvent(createRequestSubmitButton, 'press')
        })

        expect(createNewRequestMock).toHaveBeenCalledWith(mockOrgContext, {
            type: [],
            location: null,
            notes: mockRequest.notes,
            callerName: '',
            callerContactInfo: '',
            callStartedAt: mockRightNow(), // TODO: fix this test now that we set callStartDate automatically
            callEndedAt: '',
            priority: null,
            tagHandles: [],
            positions: []
        })

        const newReqCard = await waitFor(() => getByTestId(TestIds.requestCard(mockRequest.id)));

        await act(async() => {
            fireEvent(newReqCard, 'press')
        })

        const requestDetailsNotes = await waitFor(() => getByTestId(TestIds.requestDetails.notes));

        expect(requestDetailsNotes).toHaveTextContent(mockRequest.notes)
    })
})
