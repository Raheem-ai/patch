import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { IUpdateStore, organizationStore, requestStore, userStore } from './interfaces';
import { PatchEventType, PatchEventPacket, IndividualRequestEventType, UserEventType, OrgEventType, BulkRequestEventType } from '../../../common/models';
import { isOrgEventPacket, isIndividualRequestEventPacket, isUserEventPacket, isBulkRequestEventPacket } from '../../../common/utils/eventUtils';
import { stateFullMemoDebounce } from '../utils/debounce';

@Store(IUpdateStore)
export default class UpdateStore implements IUpdateStore {

    private UPDATE_REQ = Symbol('UPDATE_REQ');
    private UPDATE_ORG = Symbol('UPDATE_ORG');
    private UPDATE_USER = Symbol('UPDATE_USER');

    private minWait = 1000; // 1 sec
    private maxWait = 10 * 1000; // 10 secs

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
            if (isIndividualRequestEventPacket(packet)) {
                // TODO: make the params for these types an array and update the places the event emits
                await this.updateRequests([packet.params.requestId], packet.event)
            }

            if (isBulkRequestEventPacket(packet)) {
                const requestIds = packet.params.updatedRequestIds;

                if (requestIds.length) {
                    await this.updateRequests(requestIds, packet.event)
                } else if (this.reqState.specificIds.size) {
                    // this event isn't updating any requests but there are pending updates so we should wait to update the org 
                    // in case one of them is for the delete of a different role/attribute/tag 
                    await when(() => !this.reqState.specificIds.size)
                }
            }

            // TODO(Shifts): will need their own events/updates similar to requests

            if (isUserEventPacket(packet)) {
                await this.updateUsers(packet.params.userId, packet.event)
            }

            // wait to update the org metadata last so deleting a user defined type (role/attribute/tag) that a request/user
            // references will not show up in the ui as deleted until the affected user/requests have been updated in the ui first
            // ie. we don't try to display the name of a role that doesn't exist in the org and blow up the ui
            if (isOrgEventPacket(packet)) {
                await this.updateOrg(packet.params.orgId, packet.event)
            }
        } catch (e) {
            console.error(`Error in onEvent: ${e}`)
        }
    }

    pendingRequestUpdate = async (packet: PatchEventPacket<IndividualRequestEventType>): Promise<void> => {
        const reqId = packet.params.requestId;

        if (!this.reqState.specificIds.has(reqId)) {
            console.log('No pending request for: ', reqId)
            await this.updateRequests([reqId], packet.event)
        }

        console.log('waiting for pending request update')
        await when(() => !this.reqState.specificIds.size)
    }

    updateRequests = stateFullMemoDebounce(async (
        requestIds: string[],
        event: IndividualRequestEventType | BulkRequestEventType
    ) => {
        const ids = Array.from(this.reqState.specificIds.values());
        await requestStore().getRequests(ids)
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_REQ,
        initialState: () => this.reqState,
        beforeCall: (state, requestIds, event) => {
            if (event == PatchEventType.RequestDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                requestIds.forEach(id =>  state().specificIds.add(id))
            }
        },
        afterCall: (state, requestId, event) => {
            state().specificIds.clear()
        }
    })

    updateUsers = stateFullMemoDebounce(async (
        userId: string,
        event: UserEventType
    ) => {
        const ids = Array.from(this.userState.specificIds.values());
        await userStore().updateOrgUsers(ids)
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_USER,
        initialState: () => this.userState,
        beforeCall: (state, userId, event) => {
            if (event == PatchEventType.UserDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                state().specificIds.add(userId)
            }
        },
        afterCall: (state, userId, event) => {
            state().specificIds.clear()
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
        initialState: () => this.orgState,
        beforeCall: (state, orgId, event) => {
            state().specificId = orgId;
        },
        afterCall: (state, orgId, event) => {
            state().specificId = null;
        }
    })

    clear() {
        
    }
   
}