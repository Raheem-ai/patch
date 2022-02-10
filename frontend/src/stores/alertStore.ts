import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { IAlertStore, PromptConfig, ToastConfig } from './interfaces';

@Store(IAlertStore)
export default class AlertStore implements IAlertStore {
    defaultToastTime = 1000 * 4;
    
    toast?: ToastConfig = null;
    prompt?: PromptConfig = null;

    constructor() {
        makeAutoObservable(this)
    }

    toastSuccess(message: string, dismissable?: boolean) {
        this.toast = {
            message,
            dismissable,
            type: 'success'
        }

        //TODO: start fade in animation

        setTimeout(() => {
            // todo start fadeout animation here
            runInAction(() =>  this.toast = null)
        }, this.defaultToastTime)
    }

    toastError(message: string, dismissable?: boolean) {
        this.toast = {
            message,
            dismissable,
            type: 'success'
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