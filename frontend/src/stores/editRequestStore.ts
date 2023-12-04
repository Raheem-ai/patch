import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { CreateReqData, IRequestStore, IEditRequestStore, IUserStore, userStore, requestStore, organizationStore } from './interfaces';
import { AddressableLocation, ArrayCollectionUpdate, CategorizedItem, CategorizedItemUpdates, DefaultRoleIds, HelpRequest, MinHelpRequest, Position, PositionUpdate, PositionSetUpdate, ReplaceableRequestProps, RequestPriority, RequestType, RequestUpdates } from '../../../common/front';
import { OrgContext, RequestContext } from '../../../common/api';
import { projectArrayUpdates, projectPositionUpdates, applyUpdateToPosition, categorizedItemToString, mergeArrayCollectionUpdates, mergePositionUpdates, mergePositionSetUpdates } from '../../../common/utils';
import { api } from '../services/interfaces';

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
            itemUpdates: []
        }
    }

    newPositionIds = new Set<string>();

    async init() {
        await organizationStore().init()
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
        // currently a noop because the position component handles the default case and we only send diffs to the server
        // ie. unlike createRequestStore
    }

    async editRequest() {
        const updatedReq = await api().editRequestV2(this.requestContext(this.id), this.updates);
        requestStore().updateOrAddReq(updatedReq);
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
                itemUpdates: []
            }
        }

        this.newPositionIds = new Set<string>();
    }

    get request() {
        return requestStore().requests.get(this.id)
    }

    // computed getters that update whenever the underlying request changes or the diffs 
    // generated by the components in this form change

    get type(): RequestType[] {
        return projectArrayUpdates(this.request.type.slice(), this.updates.typeUpdates, (typ) => typ as unknown as string)
    }

    get tagHandles(): CategorizedItem[] {
        return projectArrayUpdates(this.request.tagHandles.slice(), this.updates.tagUpdates, categorizedItemToString)
    }
    
    get positions(): Position[] {
        // create a deep copy because this projection function edits both position objects and their array
        // and we don't want to actually change this.request.positions
        const cpy: Position[] = JSON.parse(JSON.stringify(this.request.positions))

        // map existing positions
        const positionsProjection = projectPositionUpdates(cpy, this.updates.positionUpdates)

        // make sure top level function doesn't break when role gets deleted 
        // that is on a position...eventually the data will catchup or the user will
        // add a diff to change it
        positionsProjection.forEach(pos => {
            if (!organizationStore().roles.get(pos.role)) {
                pos.role = DefaultRoleIds.Anyone
            }
        })

        return positionsProjection
    }

    // These consume the diffs coming back from each input that works off of diffs 
    // and merges it with the store's diff (of the latest db version) we already have 
    // ie. categorizedItems + positionUpdates
    saveTypeUpdates(inputDiff: ArrayCollectionUpdate<RequestType>) {
        mergeArrayCollectionUpdates(this.updates.typeUpdates, inputDiff, (a, b) => a == b)
    }

    saveTagUpdates(inputDiff: ArrayCollectionUpdate<CategorizedItem>) {
        mergeArrayCollectionUpdates(this.updates.tagUpdates, inputDiff, (a, b) => a.categoryId == b.categoryId && a.itemId == b.itemId)
    }

    savePositionUpdates(inputDiff: PositionSetUpdate) {
        mergePositionSetUpdates(this.updates.positionUpdates, inputDiff, this.newPositionIds)
    }

    // replaced properties...
    // - sets update the store's diff
    // - gets return the value from the store's diff or defaults to the showing what the
    // base request has
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
}