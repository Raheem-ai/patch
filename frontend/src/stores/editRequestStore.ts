import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { CreateReqData, IRequestStore, IEditRequestStore, IUserStore, userStore, requestStore, organizationStore } from './interfaces';
import { AddressableLocation, ArrayUpdates, CategorizedItem, CategorizedItemUpdates, DefaultRoleIds, HelpRequest, MinHelpRequest, Position, PositionUpdate, PositionUpdates, ReplaceableRequestProps, RequestPriority, RequestType } from '../../../common/models';
import { OrgContext, RequestContext } from '../../../common/api';
import { applyArrayUpdates, applyPositionUpdate, categorizedItemToString, mergeArrayUpdates, mergePositionUpdates } from '../../../common/utils';
import { api } from '../services/interfaces';


// TODO: turn this into UpsertRequestStore and have a computed 
// req object that merges the base req ({} for creates and the original req for edit)
// and the changes so we can update just the things you changed...so if someone 
// updates the location and there's a race with someone udpating the 
// notes they wont conflict

// TODO: make this what gets sent to editRequest
type RequestUpdates = {
    replacedProperties: {
        [key in keyof ReplaceableRequestProps]?: HelpRequest[key]
    },
    tagUpdates: ArrayUpdates<CategorizedItem>,
    typeUpdates: ArrayUpdates<RequestType>,
    positionUpdates: PositionUpdates
}

@Store(IEditRequestStore)
export default class EditRequestStore implements IEditRequestStore  {
    id: string

    // NOTE: these updates resolve all local updates vs the server 
    // ...ie. we have to merge them locally to handle multiple edits before a server sync
    updates: RequestUpdates = {
        replacedProperties: {},
        tagUpdates: {
            addedItems: [],
            removedItems: []
        },
        typeUpdates: {
            addedItems: [],
            removedItems: []
        },
        positionUpdates: {
            addedItems: [],
            removedItems: [],
            updatedPositions: []
        }
    }

    newPositionIds = new Set<string>();

    async init() {
        await organizationStore().init()
    }

    get request() {
        return requestStore().requests.get(this.id)
    }

    get type(): RequestType[] {
        return applyArrayUpdates(this.request.type.slice(), this.updates.typeUpdates, (typ) => typ as unknown as string)

    }

    get tagHandles(): CategorizedItem[] {
        return applyArrayUpdates(this.request.tagHandles.slice(), this.updates.tagUpdates, categorizedItemToString)

    }
    
    get positions(): Position[] {
        const cpy: Position[] = JSON.parse(JSON.stringify(this.request.positions))

        // map existing positions
        const positionsProjection = cpy.map(basePos => {
            const removedIdx = this.updates.positionUpdates.removedItems.findIndex(removed => removed.id == basePos.id)
            
            // if positions is in the deleted...return null
            if (removedIdx != -1) {
                return null
            }

            // if position has edits
            const editedIdx = this.updates.positionUpdates.updatedPositions.findIndex(updated => updated.id == basePos.id)
            
            if (editedIdx != -1) {
                // return existing position with updates applied
                const update = this.updates.positionUpdates.updatedPositions[editedIdx];
                applyPositionUpdate(basePos, update)
                
                return basePos
            }

            return basePos
        })
        // filter out locally or remotely removed requests
        .filter(p => !!p);

        // add all new positions to the end        
        positionsProjection.push(...this.updates.positionUpdates.addedItems)

        // make sure top level function doesn't break when role gets deleted 
        // that is on a position...eventually the data will catchup or the user will
        // add a diff to change it
        positionsProjection.forEach(pos => {
            if (!organizationStore().roles.get(pos.role)) {
                pos.role = DefaultRoleIds.Anyone
            }
        })

        console.log('PROJECTIONS: ', positionsProjection)

        return positionsProjection
    }

    // replaced properties
    get location() {
        return this.updates.replacedProperties.location == undefined
            ? this.request.location
            : this.updates.replacedProperties.location
    }

    set location(val: AddressableLocation) {
        this.updates.replacedProperties.location = val
    }

    get priority() {
        return this.updates.replacedProperties.priority == undefined
            ? this.request.priority
            : this.updates.replacedProperties.priority
    }

    set priority(val: RequestPriority) {
        this.updates.replacedProperties.priority = val
    }

    get notes() {
        return this.updates.replacedProperties.notes == undefined
            ? this.request.notes
            : this.updates.replacedProperties.notes
    }

    set notes(val: string) {
        this.updates.replacedProperties.notes = val
    }

    get callerName() {
        return this.updates.replacedProperties.callerName == undefined
            ? this.request.callerName
            : this.updates.replacedProperties.callerName
    }

    set callerName(val: string) {
        this.updates.replacedProperties.callerName = val
    }

    get callerContactInfo() {
        return this.updates.replacedProperties.callerContactInfo == undefined
            ? this.request.callerContactInfo
            : this.updates.replacedProperties.callerContactInfo
    }

    set callerContactInfo(val: string) {
        this.updates.replacedProperties.callerContactInfo = val
    }

    get callStartedAt() {
        return this.updates.replacedProperties.callStartedAt == undefined
            ? this.request.callStartedAt
            : this.updates.replacedProperties.callStartedAt
    }

    set callStartedAt(val: string) {
        this.updates.replacedProperties.callStartedAt = val
    }

    get callEndedAt() {
        return this.updates.replacedProperties.callEndedAt == undefined
            ? this.request.callEndedAt
            : this.updates.replacedProperties.callEndedAt
    }

    set callEndedAt(val: string) {
        this.updates.replacedProperties.callEndedAt = val
    }

    // validations
    get locationValid() {
        return !!this.location && !!this.location.address
    }

    get typeValid() {
        return !!this.type.length
    }

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    requestContext(requestId: string): RequestContext {
        return {
            requestId,
            ...this.orgContext()
        } 
    }

    onRoleDeletedUpdate(roleId: string) {
        // TODO: this breaks at the positioninput level...need to apply the same default logic there
    }

    async editRequest() {
        // strip ids off of new requests before sending to save
        this.updates.positionUpdates.addedItems.forEach(added => added.id = '')

        // const updatedReq = await api().editRequest(this.requestContext(reqId), req);
        // requestStore().updateOrAddReq(updatedReq);
    }
    
    loadRequest(reqId: string) {
        this.clear()
        this.id = reqId
    }

    clear() {
        this.updates = {
            replacedProperties: {},
            tagUpdates: {
                addedItems: [],
                removedItems: []
            },
            typeUpdates: {
                addedItems: [],
                removedItems: []
            },
            positionUpdates: {
                addedItems: [],
                removedItems: [],
                updatedPositions: []
            }
        }
    }

    saveTypeUpdates(diff: ArrayUpdates<RequestType>) {
        mergeArrayUpdates(this.updates.typeUpdates, diff, (a, b) => a == b)
        console.log(this.updates.typeUpdates)
    }

    saveTagUpdates(diff: ArrayUpdates<CategorizedItem>) {
        mergeArrayUpdates(this.updates.tagUpdates, diff, (a, b) => a.categoryId == b.categoryId && a.itemId == b.itemId)
        console.log(this.updates.tagUpdates)
    }

    // this is essentially `mergePositionUpdates`
    savePositionUpdates(diff: PositionUpdates) {
        const updatesForServer = this.updates.positionUpdates;
        
        // add any removes from the most recent edit to the diff with the server
        diff.removedItems.forEach(removed => {
            const idx = updatesForServer.removedItems.findIndex(pos => pos.id == removed.id)

            if (idx == -1) {
                // discard edits since the last sync with the server
                const editedIdx = updatesForServer.updatedPositions.findIndex(pos => pos.id == removed.id)
                if (editedIdx != -1) {
                    updatesForServer.updatedPositions.splice(editedIdx, 1)
                }

                // discard new positions that have never been to the server
                if (this.newPositionIds.has(removed.id)) {
                    const newIdx = updatesForServer.addedItems.findIndex(pos => pos.id == removed.id)

                    updatesForServer.addedItems.splice(newIdx, 1)
                    this.newPositionIds.delete(removed.id)
                } else {
                    // add remove to the updates to sync with the server
                    updatesForServer.removedItems.push(removed)
                }
            }

        })

        // apply updates from the most recent edit to the diff with the server
        diff.updatedPositions.forEach(update => {
            const existingUpdates = updatesForServer.updatedPositions;
            
            // apply edits to position that exists locally but is new to the server
            const updatedIdx = updatesForServer.updatedPositions.findIndex(upd => upd.id == update.id)
            if (updatedIdx != -1) {
                console.log('editing existing item: ', update.id)

                mergePositionUpdates(updatesForServer.updatedPositions[updatedIdx], update)

                console.log('after: ', JSON.stringify(updatesForServer.updatedPositions[updatedIdx], null, 4))
                return;
            }

            // apply edits to position that exists locally but is new to the server
            const addedIdx = updatesForServer.addedItems.findIndex(pos => pos.id == update.id)
            if (addedIdx != -1) {
                console.log('editing added item: ', update.id)
                applyPositionUpdate(updatesForServer.addedItems[addedIdx], update)

                console.log('after: ', JSON.stringify(updatesForServer.addedItems[addedIdx], null, 4))
                return;
            }

            // first time editing this one so add it to diff with the server
            updatesForServer.updatedPositions.push(update)
        })

        // add and track new items for processing before we send to the server
        diff.addedItems.forEach(added => {
            // save temp local id to be stripped off later
            this.newPositionIds.add(added.id);

            updatesForServer.addedItems.push(added)
        })
    }
}