import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { IUpdateStore, organizationStore, requestStore, userStore } from './interfaces';
import { PatchEventType, PatchEventPacket, RequestEventType, UserEventType, OrgEventType } from '../../../common/models';
import { isOrgEventPacket, isRequestEventPacket, isUserEventPacket } from '../../../common/utils/eventUtils';
import { stateFullMemoDebounce } from '../utils/debounce';

@Store(IUpdateStore)
export default class UpdateStore implements IUpdateStore {

    private UPDATE_REQ = Symbol('UPDATE_REQ');
    private UPDATE_ORG = Symbol('UPDATE_ORG');
    private UPDATE_USER = Symbol('UPDATE_USER');

    private minWait = 5 * 1000;
    private maxWait = 30 * 1000;

    private reqState = {
        specificIds: new Set<string>()
    }

    private userState = {
        specificIds: new Set<string>(),
    }

    private orgState = {
        specificId: null
    }

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()
        await organizationStore().init()
        await requestStore().init()
    }

    onEvent = async <T extends PatchEventType>(packet: PatchEventPacket<T>) => {
        console.log('UI onEvent(): ', packet.event, packet.params)
        try {
            if (isRequestEventPacket(packet)) {
                await this.updateRequests(packet.params.requestId, packet.event)
            }

            if (isUserEventPacket(packet)) {
                await this.updateUsers(packet.params.userId, packet.event)
            }

            if (isOrgEventPacket(packet)) {
                await this.updateOrg(packet.params.orgId, packet.event)
            }
        } catch (e) {

        }
    }

    pendingRequestUpdate = async (packet: PatchEventPacket<RequestEventType>): Promise<void> => {
        console.log('Starting pendingRequestUpdate')
        const reqId = packet.params.requestId;

        if (!this.reqState.specificIds.has(reqId)) {
            console.log('No pending request for: ', reqId)
            this.updateRequests(reqId, packet.event)
        }

        console.log('waiting for pending request update')
        await when(() => !this.reqState.specificIds.size)
        console.log('pending req finished')
    }

    updateRequests = stateFullMemoDebounce(async (
        requestId: string,
        event: RequestEventType
    ) => {
        await requestStore().getRequests(Array.from(this.reqState.specificIds.values()))
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_REQ,
        initialState: this.reqState,
        beforeCall: (state, requestId, event) => {
            if (event == PatchEventType.RequestDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                state.specificIds.add(requestId)
            }
        },
        afterCall: (state, requestId, event) => {
            state.specificIds.clear()
        }
    })

    updateUsers = stateFullMemoDebounce(async (
        userId: string,
        event: UserEventType
    ) => {
        await userStore().updateOrgUsers(Array.from(this.userState.specificIds.values()))
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_USER,
        initialState: this.userState,
        beforeCall: (state, userId, event) => {
            if (event == PatchEventType.UserDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                state.specificIds.add(userId)
            }
        },
        afterCall: (state, userId, event) => {
            state.specificIds.clear()
        }
    })

    updateOrg = stateFullMemoDebounce(async (
        orgId: string,
        event: OrgEventType
    ) => {
        await organizationStore().getOrgData()
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_ORG,
        initialState: this.orgState,
        beforeCall: (state, orgId, event) => {
            state.specificId = orgId;
        },
        afterCall: (state, orgId, event) => {
            state.specificId = null;
        }
    })

    clear() {
        
    }
   
}