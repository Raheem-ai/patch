import { makeAutoObservable } from 'mobx';
import { getStore, Store } from './meta';
import { ICreateRequestStore, IUserStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { AddressableLocation, MinHelpRequest, RequestSkill, RequestType } from '../../../common/models';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';


@Store()
export default class CreateRequestStore implements ICreateRequestStore  {

    private userStore = getStore<IUserStore>(IUserStore);
    private api = getService<IAPIService>(IAPIService)
    
    location: AddressableLocation = null
    type: RequestType[] = []
    notes: string = ''
    skills: RequestSkill[] = []
    respondersNeeded: number = 0

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: this.userStore.authToken,
            orgId: this.userStore.currentOrgId
        }
    }
    
    async createRequest() {
        try {
            const req: MinHelpRequest = {
                type: this.type,
                location: this.location,
                notes: this.notes,
                skills: this.skills,
                respondersNeeded: this.respondersNeeded
            }

            await this.api.createNewRequest(this.orgContext(), req);
        } catch (e) {
            console.error(e);
        }
    }

    clear() {
        this.location = null
        this.type = []
        this.notes = ''
        this.skills = []
        this.respondersNeeded = 0
    }
   
}