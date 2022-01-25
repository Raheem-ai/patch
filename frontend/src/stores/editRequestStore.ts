import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { CreateReqData, IRequestStore, IEditRequestStore, IUserStore, userStore, requestStore } from './interfaces';
import { AddressableLocation, MinHelpRequest, RequestSkill, RequestType } from '../../../common/models';
import { OrgContext, RequestContext } from '../../../common/api';
import { api } from '../services/interfaces';


// TODO: turn this into UpsertRequestStore and have a computed 
// req object that merges the base req ({} for creates and the original req for edit)
// and the changes so we can update just the things you changed...so if someone 
// updates the location and there's a race with someone udpating the 
// notes they wont conflict
@Store(IEditRequestStore)
export default class EditRequestStore implements IEditRequestStore  {

    location: AddressableLocation = null
    type: RequestType[] = []
    notes: string = ''
    skills: RequestSkill[] = []
    respondersNeeded: number = -1

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

    async editRequest(reqId: string) {
        try {
            const req = {
                id: reqId,
                type: this.type,
                location: this.location,
                notes: this.notes,
                skills: this.skills,
                respondersNeeded: this.respondersNeeded
            }

            const updatedReq = await api().editRequest(this.requestContext(reqId), req);
            requestStore().updateOrAddReq(updatedReq);
        } catch (e) {
            console.error(e);
        }
    }
    
    loadRequest(req: CreateReqData) {
        this.location = req.location
        this.type = req.type
        this.notes = req.notes
        this.skills = req.skills
        this.respondersNeeded = req.respondersNeeded
    }

    clear() {
        this.location = null
        this.type = []
        this.notes = ''
        this.skills = []
        this.respondersNeeded = -1
    }
   
}