import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationSettingsStore, organizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { OrgContext } from '../../../common/api';


@Store(IOrganizationSettingsStore)
export default class OrganizationSettingsStore implements IOrganizationSettingsStore {
    
    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()
        await organizationStore().init()
    }

    clear() {

    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    // nameIsValid(name: string) {
    //     return !!name
    // }

    // requestPrefixIsValid(requestPrefix: string) {
    //     return !!requestPrefix && requestPrefix.length <= this.requestPrefixCharMax
    // }

    async saveName(updatedName: string) {
        const updatedOrgData = await api().editOrgMetadata(this.orgContext(), {
            name: updatedName
        })

        organizationStore().updateOrgData(updatedOrgData)
    }

    async saveRequestPrefix(updatedPrefix: string) {
        const updatedOrgData = await api().editOrgMetadata(this.orgContext(), {
            requestPrefix: updatedPrefix
        })

        organizationStore().updateOrgData(updatedOrgData)
    }
}