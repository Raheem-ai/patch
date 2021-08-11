import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api';
import { getStore, Store } from '../di';
import { IDispatchStore, IUserStore } from '../interfaces';

@Store()
export default class DispatchStore implements IDispatchStore {

    private userStore = getStore<IUserStore>(IUserStore);

    constructor() {
        makeAutoObservable(this)
    }
    
    async dispatch() {
        try {
            await API.dispatch()
        } catch (e) {
            console.error(e);
        }
    }

    async assignIncident() {
        try {
            console.log(this.userStore)
            await API.assignIncident()
        } catch (e) {
            console.error(e);
        }
    }

   
}