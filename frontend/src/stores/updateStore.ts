import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { appUpdateStore, createRequestStore, editRequestStore, editUserStore, IUpdateStore, newUserStore, organizationStore, requestStore, userStore } from './interfaces';
import { PatchEventType, PatchEventPacket, IndividualRequestEventType, OrgEventType, BulkRequestEventType, IndividualUserEventType, BulkUserEventType, CategorizedItem, CategorizedItemUpdates } from '../../../common/models';
import { isOrgEventPacket, isIndividualRequestEventPacket, isUserEventPacket, isBulkRequestEventPacket, isBulkUserEventPacket } from '../../../common/utils/eventUtils';
import { stateFullMemoDebounce } from '../utils/debounce';

@Store(IUpdateStore)
export default class UpdateStore implements IUpdateStore {

    private UPDATE_REQ = Symbol('UPDATE_REQ');
    private UPDATE_ORG = Symbol('UPDATE_ORG');
    private UPDATE_USER = Symbol('UPDATE_USER');
    private UPDATE_DYNAMIC_CONFIG = Symbol('UPDATE_DYNAMIC_CONFIG');

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
        await appUpdateStore().init()
    }

    // TODO: put this in common
    // convenience function for typing
    isEvent<P extends PatchEventType>(packet: PatchEventPacket, target: P): packet is PatchEventPacket<P> {
        return packet.event == target
    }

    // NOTE: only gets called after being signed in from notificationStore() and socketStore()
    onEvent = async <T extends PatchEventType>(packet: PatchEventPacket<T>) => {
        console.log('UI onEvent(): ', packet.event, packet.params)
        try {

            // handle one off special cases
            if (packet.event == PatchEventType.SystemDynamicConfigUpdated) {
                // TODO: should this be debounced like the rest?!?!
                await appUpdateStore().updateDynamicConfig()
                return
            }

            // check to see if the update will cause cached stores to be out of sync with single source of truth stores
            // if it does, update all the stores that keep local caches of affected data
            // (ie. edit stores) before updating SSOT stores that we use to validate 
            // logic + pull display data from (ie. organizationStore)
            this.updateCachedStores(packet)

            if (isIndividualRequestEventPacket(packet)) {
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
                await this.updateUsers([packet.params.userId], packet.event)
            }

            if (isBulkUserEventPacket(packet)) {
                const userIds = packet.params.updatedUserIds;

                if (userIds.length) {
                    await this.updateUsers(userIds, packet.event)
                } else if (this.userState.specificIds.size) {
                    // this event isn't updating any users but there are pending updates so we should wait to update the org 
                    // in case one of them is for the delete of a different role/attribute 
                    await when(() => !this.userState.specificIds.size)
                }
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

    updateCachedStores(packet: PatchEventPacket) {
        // NOTE: each one of these cases should also get called by the store that initiates the event
        // so the initiator has their ui update as if it came from an update

        if (this.isEvent(packet, PatchEventType.OrganizationRoleDeleted)) {
            this.onRoleDeleted(packet.params.roleId)
        }

        if (this.isEvent(packet, PatchEventType.RequestDeleted)) {
            console.log("in cached stores onroledeleted");
            this.onRequestDeleted(packet.params.requestId)
        }
    }

    onRoleDeleted(roleId: string) {
        editRequestStore().onRoleDeletedUpdate(roleId)
        createRequestStore().onRoleDeletedUpdate(roleId)

        editUserStore().onRoleDeletedUpdate(roleId)
        newUserStore().onRoleDeletedUpdate(roleId)
    }

    onRequestDeleted(requestId: string){
        requestStore().onRequestDeletedUpdate(requestId);
        // almost same logic for when it does the delete itself
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
        userIds: string[],
        event: IndividualUserEventType | BulkUserEventType
    ) => {
        const ids = Array.from(this.userState.specificIds.values());
        await userStore().updateOrgUsers(ids)
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_USER,
        initialState: () => this.userState,
        beforeCall: (state, userIds, event) => {
            if (event == PatchEventType.UserDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                userIds.forEach(id => state().specificIds.add(id))
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