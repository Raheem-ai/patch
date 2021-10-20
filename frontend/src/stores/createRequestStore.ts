import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api';
import { getStore, Store } from './meta';
import { CreateReqData, ICreateRequestStore, IUserStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { AddressableLocation, HelpRequest, Location, MinHelpRequest, RequestSkill, RequestType } from '../../../common/models';


@Store()
export default class CreateRequestStore implements ICreateRequestStore  {

    private userStore = getStore<IUserStore>(IUserStore);

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

            await API.createNewRequest(this.orgContext(), req);
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