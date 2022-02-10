import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IUpdateStore, requestStore, userStore } from './interfaces';
import { PatchEventType, PatchUIEvent, PatchUIEventPacket, PatchUIEventParams } from '../../../common/models';
import { stateFullMemoDebounce } from '../utils/debounce';

@Store(IUpdateStore)
export default class UpdateStore implements IUpdateStore {

    private UPDATE_REQ = Symbol('UPDATE_REQ');
    private UPDATE_ORG = Symbol('UPDATE_ORG');
    private UPDATE_USER = Symbol('UPDATE_USER');

    private minWait = 5 * 1000;
    private maxWait = 30 * 1000;

    private reqState = {
        specificIds: new Set<string>(),
        list: false
    }

    private userState = {
        specificIds: new Set<string>(),
        list: false
    }

    private orgState = {

    }

    constructor() {
        makeAutoObservable(this)
    }

    onUIEvent = async (packet: PatchUIEventPacket) => {
        console.log('UI EVENT: ', packet.event, packet.params)
        try {
            switch (packet.event) {
                case PatchUIEvent.ForceLogout:
                    await userStore().signOut()
                    break;
            
                case PatchUIEvent.UpdateResource:
                    const params = packet.params as PatchUIEventParams[PatchUIEvent.UpdateResource]

                    if (params.orgId) {
                        // update org api doesn't exist yet
                    }

                    if (params.requestId) {
                        await this.updateRequests(params, packet);
                    }

                    if (params.userId) {
                        await this.updateUsers(params, packet);
                    }

                    break;
            }
        } catch (e) {

        }
    }

    updateRequests = stateFullMemoDebounce(async (
        params: PatchUIEventParams[PatchUIEvent.UpdateResource],
        packet: PatchUIEventPacket
    ) => {
        await requestStore().getRequests(Array.from(this.reqState.specificIds.values()))
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_REQ,
        initialState: this.reqState,
        beforeCall: (state, params, packet) => {
            if (packet.sysEvent == PatchEventType.RequestDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                state.specificIds.add(params.requestId)
            }
             
            if (params.requestList) {
                state.list = true
            }
        },
        afterCall: (state, params) => {
            state.list = false
            state.specificIds.clear()
        }
    })

    updateUsers = stateFullMemoDebounce(async (
        params: PatchUIEventParams[PatchUIEvent.UpdateResource],
        packet: PatchUIEventPacket
    ) => {
        await userStore().updateOrgUsers(Array.from(this.userState.specificIds))
    }, {
        minWait: this.minWait,
        maxWait: this.maxWait,
        paramsToMemoCacheKey: () => this.UPDATE_USER,
        initialState: this.userState,
        beforeCall: (state, params, packet) => {
            if (packet.sysEvent == PatchEventType.UserDeleted) {
                // deleted
                // TODO: we don't have a design for this yet...update when we do
                // can add state here for ui purposes
            } else {
                // added or edited
                state.specificIds.add(params.userId)
            }
             
            if (params.requestList) {
                state.list = true
            }
        },
        afterCall: (state, params) => {
            state.list = false
            state.specificIds.clear()
        }
    })

    clear() {
        
    }
   
}