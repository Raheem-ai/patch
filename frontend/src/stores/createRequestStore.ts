import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { ICreateRequestStore, requestStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { AddressableLocation, MinHelpRequest, RequestSkill, RequestType } from '../../../common/models';
import { api } from '../services/interfaces';


@Store(ICreateRequestStore)
export default class CreateRequestStore implements ICreateRequestStore  {
    location: AddressableLocation = null
    type: RequestType[] = []
    notes: string = ''
    skills: RequestSkill[] = []
    respondersNeeded: number = -1

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    get locationValid() {
        return !!this.location && !!this.location.address
    }

    get typeValid() {
        return !!this.type.length
    }
    
    async createRequest() {
        const req: MinHelpRequest = {
            type: this.type,
            location: this.location,
            notes: this.notes,
            skills: this.skills,
            respondersNeeded: this.respondersNeeded 
        }

        const createdReq = await api().createNewRequest(this.orgContext(), req);

        try {
            await requestStore().updateOrAddReq(createdReq);
        } catch (e) {
            console.error(e);
        }

        return createdReq;
    }

    clear() {
        this.location = null
        this.type = []
        this.notes = ''
        this.skills = []
        this.respondersNeeded = -1
    }
   
}