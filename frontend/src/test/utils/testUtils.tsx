import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import App from '../../../App';
import {APIClient} from '../../../src/api'
import { AppState } from 'react-native';
import boot from '../../../src/boot';
import Branch, { BranchSubscriptionEvent } from 'react-native-branch';
import { hideAsync } from 'expo-splash-screen';
import { DefaultAttributeCategories, DefaultAttributeCategoryIds, DefaultRoles, LinkExperience, LinkParams, MinUser } from '../../../../common/models';
import { MockAuthTokens, MockOrgMetadata, MockRequests, MockSecrets, MockTeamMemberMetadata, MockUsers } from '../../../src/test/mocks';
import TestIds from '../../../src/test/ids';
import { linkingStore, navigationStore, userStore } from '../../stores/interfaces';
import { routerNames } from '../../types';
import STRINGS from '../../../../common/strings';
import { GetByQuery, QueryByQuery } from '@testing-library/react-native/build/queries/makeQueries';
import { TextMatch } from '@testing-library/react-native/build/matches';
import { CommonQueryOptions, TextMatchOptions } from '@testing-library/react-native/build/queries/options';
import { TokenContext } from '../../../api';

const originalBoot = jest.requireActual('../../../src/boot').default;
const { hideAsync: originalHideAsync } = jest.requireActual('expo-splash-screen');
const appStateMock = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => null);

// Default Role text
const adminText = DefaultRoles[1].name;
const dispatcherText = DefaultRoles[2].name;
const responderText = DefaultRoles[3].name;

// Attributes text
const haitianCreoleLanguageText = DefaultAttributeCategories[0].attributes[4].name;
const frenchLanguageText = DefaultAttributeCategories[0].attributes[7].name;
const firstAidSkillText = DefaultAttributeCategories[1].attributes[2].name;
const cprTrainingText = DefaultAttributeCategories[2].attributes[0].name;

// App boot helper functions
export async function mockBoot() {
    const mockedBoot = boot as jest.MaybeMocked<typeof boot>;
    const mockedHideAsync = hideAsync as jest.MaybeMocked<typeof hideAsync>;

    mockedHideAsync.mockImplementation(originalHideAsync);

    const bootup = new Promise<void>((resolve) => {
        mockedBoot.mockImplementation((doneLoading: (() => void)) => {
            return originalBoot(() => {
                console.log('UNLOCKING AFTER MOCK BOOTUP')
                act(doneLoading)
                resolve()
            })
        })
    });

    const utils = render(<App/>);
    
    await bootup;

    return utils
}

export function linkExperienceToBranchEvent<Experience extends LinkExperience>(exp: Experience, linkParams: LinkParams[Experience]) {
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

    return branchEvent;
}

export async function mockLinkBoot<Experience extends LinkExperience>(exp: Experience, linkParams: LinkParams[Experience]) {
    // mock out changes to the Branch.subscribe in linkingStore().init()
    const branchEvent = linkExperienceToBranchEvent(exp, linkParams);

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

export async function mockDeferredLinkBoot() {
    let respondToLinkHandle: (branchEvent: BranchSubscriptionEvent) => void;

    const branchSubscribeMock = jest.spyOn(Branch, 'subscribe').mockImplementationOnce((callback: ((event: BranchSubscriptionEvent) => (() => void))) => {
        respondToLinkHandle = (branchEvent: BranchSubscriptionEvent) => callback(branchEvent);
        return () => {};
    });

    const mockedUser = MockUsers()[0];

    // mock out the api calls that will get triggered when the app
    const getMeMock = jest.spyOn(APIClient.prototype, 'me').mockResolvedValue(mockedUser);

    const { getByTestId, ...rest } = await mockBoot();
    return {
        getByTestId,
        getMeMock,
        branchSubscribeMock,
        respondToLinkHandle,
        ...rest
    }
}

export async function mockSignIn() {
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

// Joining and Sign Up Invitation Scenario helpers
export async function successfulLinkSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
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

    await waitFor(() => getByTestId(TestIds.signUpThroughOrg.screen));
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

    // After signup, app should reroute to the userHomePage
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

    // Hide toast
    await act(async() => {
        fireEvent(toastTextComponent, 'press')
    })

    // TODO: import {parseFullName} from 'parse-full-name';
    const userHomeWelcomeLabel = await waitFor(() => getByTestId(TestIds.userHome.welcomeLabel));
    expect(userHomeWelcomeLabel).toHaveTextContent(`Hi, Admin.`);
}

export async function backendErrorSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
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

    await waitFor(() => getByTestId(TestIds.signUpThroughOrg.screen));

    // These components should exist on the header and form
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
    // Hide toast
    await act(async() => {
        fireEvent(toastTextComponent, 'press')
    })
}

export async function badLinkParamsSignUpOrJoin<Experience extends LinkExperience.JoinOrganization | LinkExperience.SignUpThroughOrganization>(exp: Experience) {
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

    // Ensure that the app is on the sign in page
    await waitFor(() => getByTestId(TestIds.signIn.screen));

    // Toast error should display the expected message based on LinkExperience
    const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
    const expectedError = exp == LinkExperience.SignUpThroughOrganization ? STRINGS.LINKS.errorMessages.badSignUpThroughOrgLink() : STRINGS.LINKS.errorMessages.badJoinOrgLink();
    expect(toastTextComponent).toHaveTextContent(expectedError);
    // Hide toast
    await act(async() => {
        fireEvent(toastTextComponent, 'press')
    })
}

// Password change/reset helper functions
export async function completeUpdatePasswordForm(redirectRoute: string, getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    // Ensure that the app is on the updatePassword screen with the proper route
    await waitFor(() => {
        expect(navigationStore().currentRoute).toEqual(routerNames.updatePassword);
    })

    await waitFor(() => getByTestId(TestIds.updatePassword.screen));

    // Type in new password
    const passwordInput = await waitFor(() => getByTestId(TestIds.updatePassword.password));
    const mockedUser = MockUsers()[2];
    await act(async() => {
        fireEvent.changeText(passwordInput, mockedUser.password);
    })

    // Mock the updatePassword API call to do nothing but return without error 
    jest.spyOn(APIClient.prototype, 'updatePassword').mockImplementationOnce((ctx: TokenContext, password: string, resetCode?: string) => {
        return Promise.resolve();
    });

    // Submit the form to update password, triggering the mock above
    const updatePasswordButton = await waitFor(() => getByTestId(TestIds.updatePassword.submit))
    await act(async() => {
        fireEvent(updatePasswordButton, 'press');
    });

    // If all is successful, the app should display a toast alert confirming the update
    const toastTextComponent = await waitFor(() => getByTestId(TestIds.alerts.toast));
    expect(toastTextComponent).toHaveTextContent(STRINGS.ACCOUNT.passwordUpdated);
    await act(async() => {
        fireEvent(toastTextComponent, 'press')
    })

    // Ensure that the app properly redirects to the user home page
    // (after an intentional reroute delay for UX purposes)
    await new Promise(r => setTimeout(r, 1000));
    await waitFor(() => {
        expect(navigationStore().currentRoute).toEqual(redirectRoute);
    })
}

// Signed In helpers
export async function checkOnDutyText(getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    const onDutyTextComponent = await waitFor(() => getByTestId(TestIds.header.open.onDutyText));
    expect(onDutyTextComponent).toHaveTextContent(userStore().isOnDuty ? 'Available' : 'Unavailable');
}

export async function assignNewUserRoles(getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>, queryByTestId: QueryByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    // Test IDs relevant to retrieving controls to edit roles assigned to a user
    const editRolesTestID = TestIds.addUser.inputs.role;
    const rolesWrappedTestID = TestIds.inputs.roleList.labelWrapper(editRolesTestID);

    // Input label for Roles that shows up on the form for editing a user
    const rolesInputLabel = await waitFor(() => getByTestId(rolesWrappedTestID));

    // There should be no roles present
    expect(queryByTestId(TestIds.tags.itemN(rolesWrappedTestID, 0))).toBeNull();

    // Press roles input label to navigate to the actual roles input form
    await act(async () => {
        fireEvent(rolesInputLabel, 'click');
    })

    // Expect Admin, Dispatcher, and Responder inputs to exist in the Roles list
    const adminRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 0)));
    const dispatcherRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 1)));
    const responderRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 2)));

    // Add Dispatcher and Responder roles to user
    await act(async () => fireEvent(dispatcherRoleLabel, 'press'))
    await act(async () => fireEvent(responderRoleLabel, 'press'))

    // After saving roles, expect tags for Responder and Dispatcher to be present on the roles input label now.
    const saveRolesButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(editRolesTestID)));
    await act(async () => fireEvent(saveRolesButton, 'press'))

    const dispatcherRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 0)));
    expect(dispatcherRoleTag).toHaveTextContent(dispatcherText)

    const responderRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 1)));
    expect(responderRoleTag).toHaveTextContent(responderText)
}

export async function editUserRoles(getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    // Test IDs relevant to retrieving controls to edit roles assigned to a user
    const editRolesTestID = TestIds.editMe.inputs.roles;
    const rolesWrappedTestID = TestIds.inputs.roleList.labelWrapper(editRolesTestID);

    // Input label for Roles that shows up on the form for editing a user
    const rolesInputLabel = await waitFor(() => getByTestId(rolesWrappedTestID));

    // Expect Admin and Dispatcher tags to be present on roles input label
    let adminRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 0)));
    expect(adminRoleTag).toHaveTextContent(adminText)
    const dispatcherRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 1)));
    expect(dispatcherRoleTag).toHaveTextContent(dispatcherText)

    // Press roles input label to navigate to the actual roles input form
    await act(async () => {
        fireEvent(rolesInputLabel, 'press');
    })

    // Expect Admin, Dispatcher, and Responder inputs to exist in the Roles list
    const adminRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 0)));
    const dispatcherRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 1)));
    const responderRoleLabel = await waitFor(() => getByTestId(TestIds.editRolesForm.navInputs.roleOptionN(editRolesTestID, 2)));

    // Add Responder role to my user
    await act(async () => {
        fireEvent(responderRoleLabel, 'press');
    })

    // Remove Dispatcher role from my user
    await act(async () => {
        fireEvent(dispatcherRoleLabel, 'press');
    })

    // Save roles assigned to me
    const saveRolesButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(editRolesTestID)));
    await act(async () => {
        fireEvent(saveRolesButton, 'press');
    })

    // Expect Admin and Responder tags to now be present on roles input label
    adminRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 0)));
    expect(adminRoleTag).toHaveTextContent(adminText)
    const responderRoleTag = await waitFor(() => getByTestId(TestIds.tags.itemN(rolesWrappedTestID, 1)));
    expect(responderRoleTag).toHaveTextContent(responderText)
}

export async function editUserAttributes(getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    // Test IDs relevant to retrieving controls to edit attributes assigned to a user
    const editAttributesTestID = TestIds.editMe.inputs.attributes;
    const wrappedEditAttrsTestID = TestIds.inputs.categorizedItemList.labelWrapper(editAttributesTestID);

    // Input label for Attributes that shows up on the form for editing a user
    const attributesInput = await waitFor(() => getByTestId(wrappedEditAttrsTestID));

    // Expect to see Attribute Tags for Hatian Creole, French, and CPR.
    const languageAttrsTestId = TestIds.inputs.categorizedItemList.tagWrapper(editAttributesTestID, DefaultAttributeCategoryIds.Languages);
    let creoleAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(languageAttrsTestId, 0)));
    expect(creoleAttributeTag).toHaveTextContent(haitianCreoleLanguageText)

    const frenchAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(languageAttrsTestId, 1)));
    expect(frenchAttributeTag).toHaveTextContent(frenchLanguageText)

    const trainingsAttrsTestId = TestIds.inputs.categorizedItemList.tagWrapper(editAttributesTestID, DefaultAttributeCategoryIds.Trainings);
    let cprAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(trainingsAttrsTestId, 0)));
    expect(cprAttributeTag).toHaveTextContent(cprTrainingText)

    // Click the attribute input label so we can edit the assigned attributes on the actual form
    await act(async () => {
        fireEvent(attributesInput, 'click');
    })

    // Compose the Test IDs that retrieve the pill components that appear at the top of the Attributes form
    const categorizedItemListID = TestIds.inputs.categorizedItemList.wrapper(editAttributesTestID);
    const pillsWrappedTestID = TestIds.inputs.categorizedItemList.pills(categorizedItemListID);

    // Expect delete-able pills for Hatian Creole, French, and CPR
    const creolePill = await waitFor(() => getByTestId(TestIds.tags.itemN(pillsWrappedTestID, 0)));
    expect(creolePill).toHaveTextContent(haitianCreoleLanguageText)

    const frenchPill = await waitFor(() => getByTestId(TestIds.tags.itemN(pillsWrappedTestID, 1)));
    expect(frenchPill).toHaveTextContent(frenchLanguageText)

    let cprPill = await waitFor(() => getByTestId(TestIds.tags.itemN(pillsWrappedTestID, 2)));
    expect(cprPill).toHaveTextContent(cprTrainingText)

    // Delete the French Attribute
    const frenchDeleteIconButton = await waitFor(() => getByTestId(TestIds.tags.deleteN(pillsWrappedTestID, 1)));
    await act(async () => {
        fireEvent(frenchDeleteIconButton, 'click');
    })

    // CPR should now be the second pill
    cprPill = await waitFor(() => getByTestId(TestIds.tags.itemN(pillsWrappedTestID, 1)));
    expect(cprPill).toHaveTextContent(cprTrainingText)

    // Add a new attribute (first aid)
    // `first aid` is the third option in the Trainings category
    const trainingsAttrID = TestIds.categoryRow.wrapper(TestIds.inputs.categorizedItemList.categoryRowN(categorizedItemListID, 1));
    const firstAidRow = await waitFor(() => getByTestId(TestIds.categoryRow.itemRowN(trainingsAttrID, 2)));
    expect(firstAidRow).toHaveTextContent(firstAidSkillText)
    await act(async () => {
        fireEvent(firstAidRow, 'click');
    })

    // First aid pill should now be presen
    const firstAidPill = await waitFor(() => getByTestId(TestIds.tags.itemN(pillsWrappedTestID, 2)));
    expect(firstAidPill).toHaveTextContent(firstAidSkillText);

    // Save changes
    const saveAttrsButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(categorizedItemListID)));
    await act(async () => {
        fireEvent(saveAttrsButton, 'click');
    })

    // Validate the Attributes label now has tags for Creole, CPR, and first aid
    // in their respective categories.
    creoleAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(languageAttrsTestId, 0)));
    expect(creoleAttributeTag).toHaveTextContent(haitianCreoleLanguageText);

    cprAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(trainingsAttrsTestId, 0)));
    expect(cprAttributeTag).toHaveTextContent(cprTrainingText)

    const skillsAttrsTestId = TestIds.inputs.categorizedItemList.tagWrapper(editAttributesTestID, DefaultAttributeCategoryIds.Skills);
    const firstAidAttributeTag = await waitFor(() => getByTestId(TestIds.tags.itemN(skillsAttrsTestId, 0)));
    expect(firstAidAttributeTag).toHaveTextContent(firstAidSkillText)
}

export async function editMyPhoneNumber(getByTestId: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>) {
    const phoneInput = await waitFor(() => getByTestId(TestIds.editMe.inputs.phone));

    // Change the phone number to an invalid entry
    await act(async () => {
        fireEvent.changeText(phoneInput, '555-5555')
    });

    // Save button should be disabled
    const saveUserButton = await waitFor(() => getByTestId(TestIds.backButtonHeader.save(TestIds.editMe.form)));
    expect(saveUserButton).toBeDisabled();

    // Change the phone number to a valid 10 digit number
    await act(async () => {
        fireEvent.changeText(phoneInput, '7575555555')
    });

    // After entering valid value, the save button should be enabled
    expect(saveUserButton).not.toBeDisabled();
}
