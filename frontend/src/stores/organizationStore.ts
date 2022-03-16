import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore } from './interfaces';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    orgId = null;
    name = null;

    constructor() {
        makeAutoObservable(this)
    }

    clear() {

    }
}