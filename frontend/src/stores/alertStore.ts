import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { IAlertStore, PromptConfig, ToastConfig } from './interfaces';

@Store(IAlertStore)
export default class AlertStore implements IAlertStore {
    defaultToastTime = 1000 * 4;
    
    toast?: ToastConfig = null;
    prompt?: PromptConfig = null;
    hideToastTimer = null;

    constructor() {
        makeAutoObservable(this)
    }

    toastSuccess(message: string, unauthenticated?: boolean) {
        this.toast = {
            message,
            unauthenticated,
            type: 'success'
        }

        //TODO: start fade in animation
        // make sure only one timer is running
        clearTimeout(this.hideToastTimer);
        this.hideToastTimer = setTimeout(() => {
            // todo start fadeout animation here
            runInAction(() =>  this.hideToast())
        }, this.defaultToastTime)
    }

    toastError(message: string, unauthenticated?: boolean) {
        this.toast = {
            message,
            unauthenticated,
            type: 'success'
        }

        //TODO: start fade in animation
        // make sure only one timer is running
        clearTimeout(this.hideToastTimer);
        this.hideToastTimer = setTimeout(() => {
            // todo start fadeout animation here
            runInAction(() =>  this.hideToast())
        }, this.defaultToastTime)
    }
    
    showPrompt(config: PromptConfig) {
        this.prompt = config;
    }

    hidePrompt() {
        this.prompt = null;
    }

    hideToast() {
        // stop timer in case this was user-initiated
        clearTimeout(this.hideToastTimer);
        this.toast = null;
    }

    hideAlerts() {
        this.hidePrompt();
        this.hideToast();
    }

    clear() {
        
    }
   
}