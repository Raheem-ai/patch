import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { IAlertStore, PromptConfig, ToastConfig, UserFacingToastConfig } from './interfaces';

@Store(IAlertStore)
export default class AlertStore implements IAlertStore {
    defaultToastTime = 1000 * 4;
    
    toast?: ToastConfig = null;
    prompt?: PromptConfig = null;

    constructor() {
        makeAutoObservable(this)
    }
    
    toastSuccess(config:UserFacingToastConfig) {
        const { message, dismissable, unauthenticated, inTabbedView } = config;
        this.toast = { 
            message,
            dismissable,
            unauthenticated,
            inTabbedView,
            type: 'success'
        }

        //TODO: start fade in animation

        setTimeout(() => {
            // todo start fadeout animation here
            runInAction(() =>  this.toast = null)
        }, this.defaultToastTime)
    }

    toastError(config:UserFacingToastConfig) {
        const { message, dismissable, unauthenticated, inTabbedView } = config;
        this.toast = { 
            message,
            dismissable,
            unauthenticated,
            inTabbedView,
            type: 'error'
        }

        //TODO: start fade in animation

        setTimeout(() => {
            // todo start fadeout animation here
            runInAction(() =>  this.toast = null)
        }, this.defaultToastTime)
    }
    
    showPrompt(config: PromptConfig) {
        this.prompt = config;
    }

    hidePrompt() {
        this.prompt = null;
    }

    clear() {
        
    }
   
}