import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { headerStore, IAlertStore, PromptConfig, ToastConfig } from './interfaces';
import { Animated } from 'react-native';
import { HeaderHeight, TabbedScreenHeaderHeight } from '../constants';
import { SCREEN_WIDTH } from '../utils/dimensions';

@Store(IAlertStore)
export default class AlertStore implements IAlertStore {
    defaultToastTime = 1000 * 4;
    horizontalGutter = 20;

    alertTop: Animated.AnimatedInterpolation;
    
    toast?: ToastConfig = null;
    prompt?: PromptConfig = null;
    hideToastTimer = null;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await headerStore().init()

        // have the top of the alert react to the announcement bar
        this.alertTop = Animated.add(
            headerStore().announcementHeight, 
            HeaderHeight + TabbedScreenHeaderHeight + 20
        )
    }

    get alertWidth() { 
        return SCREEN_WIDTH - (2 * this.horizontalGutter);
    }

    get alertLeft() { 
        return this.horizontalGutter;
    }

    toastSuccess(message: string, unauthenticated?: boolean) {
        this.toast = {
            message,
            unauthenticated,
            type: 'success'
        }

        //TODO: start fade in animation (opacity can useNativeDriver!)
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

        //TODO: start fade in animation (opacity can useNativeDriver!)
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