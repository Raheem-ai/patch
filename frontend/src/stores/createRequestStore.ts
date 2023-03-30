import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { ICreateRequestStore, requestStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { AddressableLocation, CategorizedItem, CategorizedItemUpdates, DefaultRoleIds, MinHelpRequest, Position, RequestPriority, RequestType } from '../../../common/models';
import { api } from '../services/interfaces';


@Store(ICreateRequestStore)
export default class CreateRequestStore implements ICreateRequestStore  {
    location: AddressableLocation = null
    type: RequestType[] = []
    notes: string = ''

    callerName = ''
    callerContactInfo = ''
    callStartedAt = ''
    callEndedAt = ''
    priority: RequestPriority = null
    tagHandles: CategorizedItem[] = []
    positions: Position[] = []

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    // need to edit these to make sure we're sending the right params to the server
    // ie. a role is set, then it is deleted while i'm still in the create flow
    // now i'm referencing an old role and even though positionsInput handles defaulting to
    // Anyone visually
    onRoleDeletedUpdate(roleId: string) {
        this.positions.forEach(pos => {
            if (pos.role == roleId) {
                pos.role = DefaultRoleIds.Anyone
            }
        })
    }

    get locationValid() {
        return !this.location || !!this.location.address
    }

    get typeValid() {
        return !!this.type.length
    }
    
    async createRequest() {
        const req: MinHelpRequest = {
            type: this.type,
            location: this.location,
            notes: this.notes,
            callerName: this.callerName,
            callerContactInfo: this.callerContactInfo,
            callStartedAt: this.callStartedAt,
            callEndedAt: this.callEndedAt,
            priority: this.priority,
            tagHandles: this.tagHandles,
            positions: this.positions
        }

        const createdReq = await api().createNewRequest(this.orgContext(), req);

        requestStore().updateOrAddReq(createdReq);

        return createdReq;
    }

    clear() {
        this.location = null
        this.type = []
        this.notes = ''
        this.callerName = ''
        this.callerContactInfo = ''
        this.callStartedAt = ''
        this.callEndedAt = ''
        this.priority = null
        this.tagHandles = []
        this.positions = []
    }
   
}