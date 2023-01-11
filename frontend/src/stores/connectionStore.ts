import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { IConnectionStore } from './interfaces';
import NetInfo from "@react-native-community/netinfo";

@Store(IConnectionStore)
export default class ConnectionStore implements IConnectionStore {

    isConnected = false;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        const unsubscribe = NetInfo.addEventListener(state => {
            runInAction(() => {
                this.isConnected = state.isConnected && state.isInternetReachable
            })
        });
    }

    clear() {
        
    }
   
}