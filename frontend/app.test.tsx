import { render, fireEvent, waitFor, act, cleanup, waitForElementToBeRemoved } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import App from './App';
import {hideAsync} from 'expo-splash-screen';
import boot from './src/boot';
import TestIds from './src/test/ids';
import {APIClient} from './src/api'
import { MockAuthTokens, MockOrgMetadata, MockRequests, MockSecrets, MockUsers } from './src/test/mocks';
import { headerStore, navigationStore } from './src/stores/interfaces';
import { routerNames } from './src/types';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
// import PersistentStorage, { PersistentPropConfigs } from './src/meta/persistentStorage';
// import { StorageController } from 'mobx-persist-store';
import { AppState } from 'react-native';
import MockedSocket from 'socket.io-mock';
import { clearAllStores } from './src/stores/utils';
import { clearAllServices } from './src/services/utils';
import * as commonUtils from '../common/utils';

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
        getTeamMembersMock: jest.spyOn(APIClient.prototype, 'getTeamMembers').mockResolvedValue(MockUsers()),
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

        expect(toJSON()).toMatchSnapshot();

        // TODO: reenable when we use the landing screen again
        // await waitFor(() => getByTestId(TestIds.landingScreen.signInButton))
        await waitFor(() => getByTestId(TestIds.signIn.submit))
    });
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
