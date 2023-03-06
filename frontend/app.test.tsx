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
import { MockActiveRequests, MockAuthTokens, MockOrgMetadata, MockRequests, MockUsers } from './src/test/mocks';
import { headerStore, navigationStore, userStore } from './src/stores/interfaces';
import { routerNames } from './src/types';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
// import PersistentStorage, { PersistentPropConfigs } from './src/meta/persistentStorage';
// import { StorageController } from 'mobx-persist-store';
import MockedSocket from 'socket.io-mock';
import { clearAllStores } from './src/stores/utils';
import { clearAllServices } from './src/services/utils';
import * as commonUtils from '../common/utils';
import { AdminEditableUser, CategorizedItem, DefaultRoles, HelpRequest, HelpRequestFilter, HelpRequestFilterToLabelMap, LinkExperience, LinkParams, Me, PendingUser, RequestStatus } from '../common/models';
import STRINGS from '../common/strings';
import * as testUtils from './src/test/utils/testUtils'
import { OrgContext } from './api';

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

        const newReqCard = await waitFor(() => getByTestId(TestIds.requestCard(TestIds.requestList.screen, mockRequest.id)));

        await act(async() => {
            fireEvent(newReqCard, 'press')
        })

        const requestDetailsNotes = await waitFor(() => getByTestId(TestIds.requestDetails.notes));

        expect(requestDetailsNotes).toHaveTextContent(mockRequest.notes)
    })

    test('Change availability', async () => {
        console.log('Change availability run')
        const {
            getByTestId
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Open header menu
        let openMenuButton = await waitFor(() => getByTestId(TestIds.header.menu));
        await act(async() => fireEvent(openMenuButton, 'click'));

        // Mock the API call to update a user's onDuty status
        const setOnDutyMock = jest.spyOn(APIClient.prototype, 'setOnDutyStatus').mockImplementation((ctx: OrgContext, onDuty: boolean) => {
            const updatedMockUser = MockUsers()[0];
            updatedMockUser.organizations[MockOrgMetadata().id].onDuty = onDuty;
            return Promise.resolve(updatedMockUser);
        });

        // Toggle user's onDuty status by firing an event on the toggle 
        const dutyToggle = await waitFor(() => getByTestId(TestIds.header.open.toggleDuty));
        await testUtils.checkOnDutyText(getByTestId);
        const initialOnDutyValue = userStore().isOnDuty;
        await act(async() => {
            fireEvent(dutyToggle, 'onValueChange', true)
        })

        // Ensure the mock was called with the expected parameters
        await waitFor(() => {
            expect(setOnDutyMock).toHaveBeenCalledWith(
                {
                    token: MockAuthTokens().accessToken,
                    orgId: MockOrgMetadata().id
                },
                true
            )
        })

        // Check that the updated on duty value is different than the initial value
        const updatedOnDutyValue = userStore().isOnDuty;
        await testUtils.checkOnDutyText(getByTestId);
        await waitFor(() => {
            expect(initialOnDutyValue).toEqual(!updatedOnDutyValue);
        })

        // Close the menu so we can validate that the onDuty status icon of the header works as well
        let menuCloseIcon = await waitFor(() => getByTestId(TestIds.header.open.close));
        await act(async() => {
            fireEvent(menuCloseIcon, 'press')
        })

        const onDutyStatusIcon = await waitFor(() => getByTestId(TestIds.header.closed.status));
        await act(async() => {
            fireEvent(onDutyStatusIcon, 'press')
        })

        // Confirm prompt opens with expected text content.
        // Press the prompt option to change our onDuty status.
        const promptAlert = await waitFor(() => getByTestId(TestIds.alerts.prompt));
        expect(promptAlert).toHaveTextContent(STRINGS.INTERFACE.availabilityAlertMessage(updatedOnDutyValue));

        const confirmChangeInput = await waitFor(() => getByTestId(TestIds.header.availabilityPrompt.confirm));
        await act(async() => {
            fireEvent(confirmChangeInput, 'press')
        })

        // Confirm the final on duty status is the opposite of the previous,
        // and the same as our initial value.
        const finalUpdateDutyValue = userStore().isOnDuty;
        await waitFor(() => {
            expect(finalUpdateDutyValue).toEqual(initialOnDutyValue);
            expect(finalUpdateDutyValue).toEqual(!updatedOnDutyValue);
        })

        // Open header to confirm the expected on duty text is displayed
        openMenuButton = await waitFor(() => getByTestId(TestIds.header.menu));
        await act(async() => fireEvent(openMenuButton, 'click'));
        await testUtils.checkOnDutyText(getByTestId);
    })

    test('Update profile', async () => {
        console.log('Update profile run')
        const {
            getByTestId,
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Open header menu
        let openMenuButton = await waitFor(() => getByTestId(TestIds.header.menu));
        await act(async() => fireEvent(openMenuButton, 'click'));

        const profileButton = await waitFor(() => getByTestId(TestIds.header.submenu.profile));
        await act(async () => {
            fireEvent(profileButton, 'press');
        })
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userDetails));

        const editProfileButton = await waitFor(() => getByTestId(TestIds.header.actions.editProfile));
        await act(async () => {
            fireEvent(editProfileButton, 'press');
        })

        // Make sure all expected fields are present
        // Email, Roles, and Attributes input components are checked below and/or in their helpers.
        await waitFor(() => getByTestId(TestIds.editMe.inputs.name));
        await waitFor(() => getByTestId(TestIds.editMe.inputs.bio));
        await waitFor(() => getByTestId(TestIds.editMe.inputs.pronouns));
        await waitFor(() => getByTestId(TestIds.editMe.removeUser));
        await waitFor(() => getByTestId(TestIds.editMe.deleteAccount));

        // Email input should be disabled/non-editable
        const emailInput = await waitFor(() => getByTestId(TestIds.editMe.inputs.email));
        expect(emailInput).toBeDisabled();

        // Edit Roles
        await testUtils.editUserRoles(getByTestId)

        // Edit Attributes
        await testUtils.editUserAttributes(getByTestId);

        // Edit phone number
        await testUtils.editMyPhoneNumber(getByTestId);

        // Mock editMe API call
        jest.spyOn(APIClient.prototype, 'editMe').mockImplementation((ctx: OrgContext, me: Partial<Me>, protectedUser?: Partial<AdminEditableUser>) => {
            // Update mocked user with values edited during this test;
            const updatedMockUser = MockUsers()[0];
            updatedMockUser.phone = me.phone;
            updatedMockUser.organizations[ctx.orgId].roleIds = protectedUser.roleIds;
            updatedMockUser.organizations[ctx.orgId].attributes = protectedUser.attributes;
            return Promise.resolve(updatedMockUser);
        });

        const saveUserButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.editMe.form)));
        await act(async () => {
            fireEvent(saveUserButton, 'click');
        })

        // Expect to be rerouted back to user profile and receive a toast message for successful save
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userDetails));
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.ACCOUNT.updatedProfileSuccess());
        await act(async() => fireEvent(toastTextComponent, 'press'));
    })

    test('Invite to Patch', async () => {
        console.log('Invite to Patch run...');
        const {
            getByTestId,
            queryByTestId,
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Navigate to Team List page
        const teamButton = await waitFor(() => getByTestId(TestIds.userHome.goToTeam));
        await act(async() => fireEvent(teamButton, 'click'));

        await waitFor(() => getByTestId(TestIds.team.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.teamList));

        // Add team member
        const addTeamMemberButton = await waitFor(() => getByTestId(TestIds.header.actions.addTeamMember));
        await act(async () => {
            fireEvent(addTeamMemberButton, 'click');
        })

        // Send Invite button (technically a variant of the backButtonHeader save button)
        // Should be disabled as valid email and phone numbers have not been entered
        const sendInviteButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.addUser.form)));
        expect(sendInviteButton).toHaveTextContent(STRINGS.ACCOUNT.sendInvite);
        expect(sendInviteButton).toBeDisabled();

        // Get phone and email inputs.
        const emailInput = await waitFor(() => getByTestId(TestIds.addUser.inputs.email));
        const phoneInput = await waitFor(() => getByTestId(TestIds.addUser.inputs.phone));

        // Valid and invalid contact info variations
        const validPhone = '7575555555';
        const invalidPhone = '555-5555';
        const validEmail = 'testNewUser@test.com';
        const invalidEmail = 'testNewUserATtest.com';

        // Both fields invalid, confirm send invite button still disabled
        await act(async () => fireEvent.changeText(emailInput, invalidEmail));
        await act(async () => fireEvent.changeText(phoneInput, invalidPhone));
        expect(sendInviteButton).toBeDisabled();

        // Valid phone but invalid email, confirm send invite button still disabled
        await act(async () => fireEvent.changeText(phoneInput, validPhone));
        expect(sendInviteButton).toBeDisabled();

        // Valid email but invalid phone, confirm send invite button still disabled
        await act(async () => fireEvent.changeText(phoneInput, invalidPhone));
        await act(async () => fireEvent.changeText(emailInput, validEmail));
        expect(sendInviteButton).toBeDisabled();

        // Both fields valid, invite button should be enabled.
        await act(async () => fireEvent.changeText(phoneInput, validPhone));
        expect(sendInviteButton).not.toBeDisabled();

        // Assign some roles to new user
        await testUtils.assignNewUserRoles(getByTestId, queryByTestId);

        // Mock inviteUserToOrg API call
        const inviteUserToOrgMock = jest.spyOn(APIClient.prototype, 'inviteUserToOrg').mockImplementation((ctx: OrgContext, email: string, phone: string, roleIds: string[], attributes: CategorizedItem[], baseUrl: string) => {
            const invitedUser: PendingUser = {
                email,
                phone,
                roleIds,
                attributes,
                pendingId: '__newUser'
            };
            return Promise.resolve(invitedUser);
        });

        // Send invitation
        await act(async () => fireEvent(sendInviteButton, 'click'));

        await waitFor(() => {
            expect(inviteUserToOrgMock).toHaveBeenCalledWith({ orgId: MockOrgMetadata().id, token: MockAuthTokens().accessToken },
                                                             validEmail,
                                                             validPhone,
                                                             [DefaultRoles[2].id, DefaultRoles[3].id],
                                                             [],
                                                             '');
        })

        // Expect to be rerouted back to team list and receive a toast message for successful save
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.teamList));
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.ACCOUNT.invitationSuccessful(validEmail, validPhone));
        await act(async() => fireEvent(toastTextComponent, 'press'));
    })

    test('Notify people of request', async () => {
        console.log('Notify people run...');
        const {
            getByTestId,
            queryByTestId
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Open menu
        const openMenuButton = await waitFor(() => getByTestId(TestIds.header.menu));
        await act(async() => fireEvent(openMenuButton, 'click'));

        // Navigate to the Request List screen
        const navToRequestButton = await waitFor(() => getByTestId(TestIds.header.navigation.requests));
        await act(async () => fireEvent(navToRequestButton, 'press'));
        await waitFor(() => !headerStore().isOpen && navigationStore().currentRoute == routerNames.helpRequestList);
        await waitFor(() => getByTestId(TestIds.requestList.screen));

        // By default, each active request in our mock data should have a request card displayed.
        await testUtils.validateRequestListCards((req: HelpRequest) => req.status != RequestStatus.Closed, getByTestId, queryByTestId);

        // Navigate to Request Details screen for first active request
        const requests = MockActiveRequests();
        const requestCard = await waitFor(() => getByTestId(TestIds.requestCard(TestIds.requestList.screen, requests[0].id)));
        await act(async () => fireEvent(requestCard, 'press'));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.helpRequestDetails));
        await waitFor(() => getByTestId(TestIds.requestDetails.overview));

        // Click on the Team tab
        const teamTab = await waitFor(() => getByTestId(TestIds.tabbedScreen.tabN(TestIds.requestDetails.screen, 2)));
        await act(async () => fireEvent(teamTab, 'press'));
        await waitFor(() => getByTestId(TestIds.requestDetails.team));

        // Press button to notify people
        const notifyDrawerButton = await waitFor(() => getByTestId(TestIds.requestDetails.notifyPeople));
        await act(async () => fireEvent(notifyDrawerButton, 'press'));

        // "Notify _ people" button on bottom drawer store view
        const notifyNPeopleButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.assignResponders.view)));
        expect(notifyNPeopleButton).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.notifyNPeople(0, 0));

        // Ensure that both users in the mock organization are represented with an unselected responder row
        const assignableUsers = MockUsers().slice(0,2);
        await waitFor(() => assignableUsers.forEach((u, i) => getByTestId(TestIds.assignResponders.unselectedRowN(TestIds.assignResponders.view, i))));

        // Click on a responder row to make sure the "notify" button text updates as expected
        const responderRow = await waitFor(() => getByTestId(TestIds.assignResponders.unselectedRowN(TestIds.assignResponders.view, 1)));
        await act(async () => fireEvent(responderRow, 'press'));
        expect(notifyNPeopleButton).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.notifyNPeople(1, 0));

        // Input and associated text for the toggle "select all" button
        const toggleSelectAllBtn = await waitFor(() => getByTestId(TestIds.assignResponders.toggleSelectAllBtn));
        const toggleSelectAllText = await waitFor(() => getByTestId(TestIds.assignResponders.toggleSelectAllText));

        // Since all users are currently not selected, the text should say select all
        expect(toggleSelectAllText).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.selectAll);

        // After pressing toggle button, text should switch and all responder rows should be selected
        await act(async () => fireEvent(toggleSelectAllBtn, 'press'));
        expect(toggleSelectAllText).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.unselectAll);
        await waitFor(() => assignableUsers.forEach((u, i) => getByTestId(TestIds.assignResponders.selectedRowN(TestIds.assignResponders.view, i))));

        // After pressing again, text should again switch, all responder rows should be unselected, and notify button should be disabled
        await act(async () => fireEvent(toggleSelectAllBtn, 'press'));
        expect(notifyNPeopleButton).toBeDisabled();
        expect(toggleSelectAllText).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.selectAll);
        await waitFor(() => assignableUsers.forEach((u, i) => getByTestId(TestIds.assignResponders.unselectedRowN(TestIds.assignResponders.view, i))));

        // Press responder row again, expect button text to update for one selection.
        await act(async () => fireEvent(responderRow, 'press'));
        expect(notifyNPeopleButton).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.notifyNPeople(1, 0));

        // Press notify button to begin submission flow. Expect toast success alert.
        await act(async () => fireEvent(notifyNPeopleButton, 'press'));
        const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
        expect(toastTextComponent).toHaveTextContent(STRINGS.REQUESTS.NOTIFICATIONS.nPeopleNotified(1));
        await act(async() => fireEvent(toastTextComponent, 'press'));
    })

    test('View requests on map', async () => {
        console.log('View requests on map run');
        const {
            getByTestId,
            queryByTestId
        } = await testUtils.mockSignIn()

        // After sign in, app should reroute user to the userHomePage
        await waitFor(() => getByTestId(TestIds.home.screen));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.userHomePage));

        // Navigate to the Request List screen
        const requestsButton = await waitFor(() => getByTestId(TestIds.userHome.goToRequests));
        await act(async () => fireEvent(requestsButton, 'press'));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.helpRequestList));

        // Open list header to filter
        const toggleListHeaderBtn = await waitFor(() => getByTestId(TestIds.listHeader.toggleHeader));
        await act(async () => fireEvent(toggleListHeaderBtn, 'press'));

        // Active, Closed, All
        const filterOptions = commonUtils.allEnumValues<HelpRequestFilter>(HelpRequestFilter);

        // By Default "Active" is the chosen filter
        // Ensure that only active requests have their request card displayed.
        await waitFor(() => getByTestId(TestIds.listHeader.chosenOption(0, HelpRequestFilterToLabelMap[filterOptions[0]])));
        await testUtils.validateRequestListCards((req: HelpRequest) => req.status != RequestStatus.Closed, getByTestId, queryByTestId);

        // Select the closed requests filter. It should now be the chosen option.
        // Expect closed requests to have cards, and other requests to be null.
        const closedRequestsFilter = await waitFor(() => getByTestId(TestIds.listHeader.option(0, HelpRequestFilterToLabelMap[filterOptions[1]])));
        await act(async () => fireEvent(closedRequestsFilter, 'press'));
        await waitFor(() => getByTestId(TestIds.listHeader.chosenOption(0, HelpRequestFilterToLabelMap[filterOptions[1]])));
        await testUtils.validateRequestListCards((req: HelpRequest) => req.status == RequestStatus.Closed, getByTestId, queryByTestId);

        // Select the all requests filter. It should now be the chosen option.
        // Expect all request cards to be displayed.
        const allRequestsFilter = await waitFor(() => getByTestId(TestIds.listHeader.option(0, HelpRequestFilterToLabelMap[filterOptions[2]])));
        await act(async () => fireEvent(allRequestsFilter, 'press'));
        await waitFor(() => getByTestId(TestIds.listHeader.chosenOption(0, HelpRequestFilterToLabelMap[filterOptions[2]])));
        await testUtils.validateRequestListCards((req: HelpRequest) => true, getByTestId, queryByTestId);

        // Filter back to active requests for map view
        const activeRequestsFilter = await waitFor(() => getByTestId(TestIds.listHeader.option(0, HelpRequestFilterToLabelMap[filterOptions[0]])));
        await act(async () => fireEvent(activeRequestsFilter, 'press'));

        // Click the option to open the Request Map from the header
        const helpRequestMapBtn = await waitFor(() => getByTestId(TestIds.header.actions.goToHelpRequestMap));
        await act(async () => fireEvent(helpRequestMapBtn, 'press'));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.helpRequestMap));

        // Interact with the request cards on the map
        const activeRequests = MockActiveRequests();

        // Swipe to the end of the request card track (and on last card),
        // making sure the request card we expect to be in viewport actually is.
        for (let iReqCard = 0; iReqCard < activeRequests.length; iReqCard++) {
            // Swipe the card track
            await testUtils.swipeRequestCardTrack(true, getByTestId);

            // After the swipe, the next card (index + 1) is visible,
            // unless we swiped on the last card in the track.
            // In which case the visible card remains the current index.
            let visibleIdx = iReqCard == activeRequests.length - 1 ? iReqCard : iReqCard + 1;

            // Check the TestID of each request card to ensure that
            // the proper card is visible and the rest are off screen.
            await testUtils.validateRequestMapCards(activeRequests, visibleIdx, getByTestId);
        }

        // Same behavior as the loop above, but reverse order (from last to first request card)
        for (let iReqCard = activeRequests.length - 1; iReqCard >= 0; iReqCard--) {
            // Swipe, update visible index (swiping on first card is special case), check all request cards.
            await testUtils.swipeRequestCardTrack(false, getByTestId);
            let visibleIdx = iReqCard == 0 ? iReqCard : iReqCard - 1;
            await testUtils.validateRequestMapCards(activeRequests, visibleIdx, getByTestId);
        }

        // Navigate back to Request List
        const helpRequestListBtn = await waitFor(() => getByTestId(TestIds.header.actions.goToHelpRequestList));
        await act(async () => fireEvent(helpRequestListBtn, 'press'));
        await waitFor(() => expect(navigationStore().currentRoute).toEqual(routerNames.helpRequestList));
    })
})
