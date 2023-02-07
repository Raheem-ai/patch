import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import App from '../App';
import {APIClient} from '../src/api'
import { AppState } from 'react-native';
import boot from '../src/boot';
import Branch, { BranchSubscriptionEvent } from 'react-native-branch';
import { hideAsync } from 'expo-splash-screen';
import { LinkExperience, LinkParams } from '../models';
import { MockAuthTokens, MockOrgMetadata, MockRequests, MockSecrets, MockTeamMemberMetadata, MockUsers } from '../src/test/mocks';
import TestIds from '../src/test/ids';

const originalBoot = jest.requireActual('../src/boot').default;
const { hideAsync: originalHideAsync } = jest.requireActual('expo-splash-screen');
const appStateMock = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => null)

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