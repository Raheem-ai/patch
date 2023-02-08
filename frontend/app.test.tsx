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
import TestIds from './src/test/ids';
import {APIClient} from './src/api'
import { MockAuthTokens, MockOrgMetadata, MockRequests, MockUsers } from './src/test/mocks';
import { headerStore, navigationStore } from './src/stores/interfaces';
import { routerNames } from './src/types';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
// import PersistentStorage, { PersistentPropConfigs } from './src/meta/persistentStorage';
// import { StorageController } from 'mobx-persist-store';
import MockedSocket from 'socket.io-mock';
import { clearAllStores } from './src/stores/utils';
import { clearAllServices } from './src/services/utils';
import * as commonUtils from '../common/utils';
import { LinkExperience, LinkParams } from '../common/models';
import STRINGS from '../common/strings';
import * as testUtils from './src/test/utils/testUtils'

// // TODO: maybe these need to be put into the beforeEach so all mocks can be safely reset each time
jest.mock('./src/boot')
jest.mock('expo-splash-screen')
jest.mock('./src/meta/persistentStorage')

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

describe('Boot Scenarios', () => {
    test('Waits for stores to load to hide the Splash Screen', async () => {
        render(<App/>);
        expect(hideAsync).not.toHaveBeenCalled();
    });

    test('Hides the Splash Screen and shows the landing page after stores load', async () => {
        const { getByTestId, toJSON } = await testUtils.mockBoot();

        expect(hideAsync).toHaveBeenCalled();

        // expect(toJSON()).toMatchSnapshot();

        // TODO: reenable when we use the landing screen again
        // await waitFor(() => getByTestId(TestIds.landingScreen.signInButton))
        await waitFor(() => getByTestId(TestIds.signIn.submit))
    });
})

describe('Join or Sign Up from Invitation Scenarios', () => {

    afterEach(() => {
        cleanup()
        clearAllStores()
        clearAllServices()
    })

    test('Successful sign up through org, navigate to home page', async () => {
        console.log('Sign Up - Successful run')
        await testUtils.successfulLinkSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Open app with bad sign up link params, show error toast', async () => {
        console.log('Sign Up - Bad link params run')
        await testUtils.badLinkParamsSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Backend sign up error, show toast', async () => {
        console.log('Sign Up - Backend error run')
        await testUtils.backendErrorSignUpOrJoin(LinkExperience.SignUpThroughOrganization);
    })

    test('Successful join org, navigate to home page', async () => {
        console.log('Join Org - Successful run')
        await testUtils.successfulLinkSignUpOrJoin(LinkExperience.JoinOrganization);
    })

    test('Open app with bad join org link params, show error toast', async () => {
        console.log('Join Org - Bad link params run')
        await testUtils.badLinkParamsSignUpOrJoin(LinkExperience.JoinOrganization);
    })

    test('Backend join organization error, show toast', async () => {
        console.log('Join Org - Backend error run')
        await testUtils.backendErrorSignUpOrJoin(LinkExperience.JoinOrganization);
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
        } = await testUtils.mockLinkBoot('' as LinkExperience, linkParams);

        // Ensure that the app is on the sign in page
        await waitFor(() => getByTestId(TestIds.signIn.screen));

        // Toast error alert should show the unknown link text 
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.LINKS.errorMessages.unknownLink());
        // Hide toast
        await act(async() => {
            fireEvent(toastTextComponent, 'press')
        })
    })
})

describe('Password Scenarios', () => {
    afterEach(() => {
        cleanup()
        clearAllStores()
        clearAllServices()
    })

    test('Reset password deferred link boot', async () => {
        console.log('Reset password - deferred link boot')
        // Mock deferred boot boots up the app and provides a function to call
        // later when we want to reopen the app via the reset password link.
        const { getByTestId, respondToLinkHandle, toJSON, ...rest } = await testUtils.mockDeferredLinkBoot();

        // Ensure that the app is on the sign in screen
        await waitFor(() => getByTestId(TestIds.signIn.screen));

        // Prese the "forgot password" text
        const forgotPasswordText = await waitFor(() => getByTestId(TestIds.signIn.forgot));
        await act(async() => {
            fireEvent(forgotPasswordText, 'press')
        })

        // Ensure that the app is on the send reset code screen
        await waitFor(() => {
            expect(navigationStore().currentRoute).toEqual(routerNames.sendResetCode);
        })
        await waitFor(() => getByTestId(TestIds.sendResetCode.screen));

        /*
        // Press cancel, send us back to sign in screen
        const cancelInput = await waitFor(() => getByTestId(TestIds.sendResetCode.cancel))
        await act(async() => {
            fireEvent(cancelInput, 'press')
        })

        // Ensure that the app is on the app landing screen
        await waitFor(() => {
            expect(navigationStore().currentRoute).toEqual(routerNames.landing);
        })
        await waitFor(() => getByTestId(TestIds.signIn.screen));

        // Press forgot password again
        // this time to follow through with sending the reset code
        const newForgotPasswordText = await waitFor(() => getByTestId(TestIds.signIn.forgot));
        await act(async() => {
            fireEvent(newForgotPasswordText, 'press')
        })

        // Ensure that the app is on the send reset code screen
        await waitFor(() => {
            expect(navigationStore().currentRoute).toEqual(routerNames.sendResetCode); // FAILING TEST
        })
        await waitFor(() => getByTestId(TestIds.sendResetCode.screen));
        */

        // Fill out the form with the mocked user data
        const mockedUser = MockUsers()[2];
        const emailInput = await waitFor(() => getByTestId(TestIds.sendResetCode.email));
        await act(async() => {
            fireEvent.changeText(emailInput, mockedUser.email)
        })

        // Mock the sendResetCode API to do nothing, but return without error for the sake of the test.
        jest.spyOn(APIClient.prototype, 'sendResetCode').mockImplementationOnce((email: string, baseUrl: string) => {
            return Promise.resolve();
        });

        // Press button to send reset password link, triggering the mock above.
        const sendLinkButton = await waitFor(() => getByTestId(TestIds.sendResetCode.sendLink))
        await act(async() => {
            fireEvent(sendLinkButton, 'press');
        });

        // Sleep for one second to wait for the app to redirect to the landing page.
        await new Promise(r => setTimeout(r, 1000));
        await waitFor(() => {
            expect(navigationStore().currentRoute).toEqual(routerNames.landing);
        })
        await waitFor(() => getByTestId(TestIds.signIn.screen));

        // If all was successful, the app should display a toast alert that the reset password was sent.
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.ACCOUNT.resetPasswordCodeSent);
        await act(async() => {
            fireEvent(toastTextComponent, 'press')
        })

        // Simulate re-opening the app via a reset password link.
        const signInWithCodeMock = jest.spyOn(APIClient.prototype, 'signInWithCode').mockResolvedValue(MockAuthTokens());
        const linkParams: LinkParams[LinkExperience.ResetPassword] = { code: 'xxxx-code-xxxx' };
        const branchEvent = testUtils.linkExperienceToBranchEvent(LinkExperience.ResetPassword, linkParams);
        await act(async() => {
            respondToLinkHandle(branchEvent);
        })
        await waitFor(() => {
            expect(signInWithCodeMock).toHaveBeenCalledWith(linkParams.code);
        });

        // Validate app behavior once we've re-opened the app from this link
        await testUtils.completeUpdatePasswordForm(routerNames.userHomePage, getByTestId);
    })

    test('Reset password link boot', async () => {
        console.log('Reset password - link boot')
        // Boot the app from a password reset link
        const signInWithCodeMock = jest.spyOn(APIClient.prototype, 'signInWithCode').mockResolvedValue(MockAuthTokens());
        const linkParams: LinkParams[LinkExperience.ResetPassword] = { code: 'xxxx-code-xxxx' };
        const { getByTestId, ...rest } = await testUtils.mockLinkBoot(LinkExperience.ResetPassword, linkParams);
        await waitFor(() => {
            expect(signInWithCodeMock).toHaveBeenCalledWith(linkParams.code);
        });

        // Validate app behavior once we've booted the app from this link
        await testUtils.completeUpdatePasswordForm(routerNames.userHomePage, getByTestId);
    })

    test('Change password via settings', async () => {
        console.log('Change password - settings')
        const {
            getByTestId,
            toJSON
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Open header menu
        const openHeaderButton = await waitFor(() => getByTestId(TestIds.header.menu));
        await act(async() => fireEvent(openHeaderButton, 'click'));


        const settingsButton = await waitFor(() => getByTestId(TestIds.header.submenu.settings));
        fireEvent(settingsButton, 'press');
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.settings));

        // TODO: Why doesn't TestIds.settings.form appear?
        // console.log(JSON.stringify(toJSON()));
        // await waitFor(() => getByTestId(TestIds.settings.form));
        const updatePasswordInput = await waitFor(() => getByTestId(TestIds.settings.inputs.updatePassword));
        await act(async() => fireEvent(updatePasswordInput, 'press'));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.updatePassword));

        /*
        // BREAKS FIRST ASSERTION IN completeUpdatePasswordForm
        // Cancel update password
        const cancelText = await waitFor(() => getByTestId(TestIds.updatePassword.cancel));
        await act(async() => fireEvent(cancelText, 'press'));

        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.settings));

        const newUpdatePasswordInput = await waitFor(() => getByTestId(TestIds.settings.inputs.updatePassword));
        await act(async() => fireEvent(newUpdatePasswordInput, 'press'));
        */

        // Fill out new password info and submit form
        await testUtils.completeUpdatePasswordForm(routerNames.settings, getByTestId);
    })
})

describe('Signed in Scenarios', () => {
    afterEach(() => {
        cleanup()
        clearAllStores()
        clearAllServices()
    })

    test('Stores fetch initial data after sign in and route to homepage', async () => {
        console.log('Signed In - Fetch initial data run')
        const {
            signInMock,
            getMeMock,
            getTeamMembersMock,
            getOrgMetadataMock,
            getOrgSecretsMock,
            getRequestsMock,
            getByTestId,
            mockedUser
        } = await testUtils.mockSignIn()

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
        console.log('Signed In - Create request after login run')
        const {
            getByTestId,
            mockedUser,
            toJSON,
            getOrgMetadataMock,
            signInMock
        } = await testUtils.mockSignIn()

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
        
        const createRequestSubmitButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.createRequest.form)));

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
