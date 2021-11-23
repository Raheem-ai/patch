import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IHeaderStore } from './interfaces';

@Store(IHeaderStore)
export default class HeaderStore implements IHeaderStore {

    isOpen = false;

    constructor() {
        makeAutoObservable(this)
    }

    open() {
        this.isOpen = true
    }

    close() {
        this.isOpen = false;
    }

    clear() {
        
    }
   
}