import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api';
import { getStore, Store } from './meta';
import { IDispatchStore, IUserStore } from './interfaces';

@Store()
export default class DispatchStore implements IDispatchStore {

    private userStore = getStore<IUserStore>(IUserStore);

    constructor() {
        makeAutoObservable(this)
    }
    
    async broadcastRequest(requestId: string, to: string[]) {
        try {
            await API.broadcastRequest(this.userStore.authToken, requestId, to);
        } catch (e) {
            console.error(e);
        }
    }

    async assignRequest(requestId: string, to: string[]) {
        try {
            console.log(this.userStore)
            await API.assignRequest(this.userStore.authToken, requestId, to)
        } catch (e) {
            console.error(e);
        }
    }

   
}