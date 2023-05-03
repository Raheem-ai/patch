import { makeAutoObservable, runInAction, when } from "mobx";
import moment from "moment";
import { appRuntimeVersion } from "../config";
import { isIos } from "../constants";
import { persistent } from "../meta";
import { api } from "../services/interfaces";
import { alertStore, IDynamicConfigStore, userStore } from "./interfaces";
import { Store } from "./meta";

@Store(IDynamicConfigStore)
export default class DynamicConfigStore implements IDynamicConfigStore {
    
    @persistent()
    appVersion = {
        latestIOS: '',
        latestAndroid: '',
        requiresUpdate: false
    }

    @persistent() lastAppVersionPrompt = '' 

    // timeBeforeNextPromptInMs = 1000 * 60 * 60 * 24 * 7 // 7 days
    timeBeforeNextPromptInMs = 1000 * 10 // 10 secs

    constructor() {
        makeAutoObservable(this);
    }

    async init() {
        await userStore().init()
        await alertStore().init()

        const needToUpdate = () => isIos
            ? this.appVersion.latestIOS && this.appVersion.latestIOS != appRuntimeVersion
            : this.appVersion.latestAndroid && this.appVersion.latestAndroid != appRuntimeVersion

        when(needToUpdate, () => {
            /**
             * right now this will happen once you sign in and then whenever the appversion config
             * dynamiclaly changes and this store updates
             */

            if (this.appVersion.requiresUpdate) {
                this.promptForRequiredUpdate()
            } else {
                // if you have already answered the prompt, it will remind you next time you sign in after X time period

                const now = new Date();
                
                const lastPrompt = this.lastAppVersionPrompt 
                    ? new Date(this.lastAppVersionPrompt)
                    : now

                const waitTime = moment(now).diff(lastPrompt) 
                const waitedLongEnough = waitTime > this.timeBeforeNextPromptInMs;

                if (!this.lastAppVersionPrompt || waitedLongEnough)
                    this.promptForOptionalUpdate()
            }
        })

        if (!userStore().signedIn) {
            when(() => userStore().signedIn, this.updateAfterSignIn)
        }
    }

    updateAfterSignIn = async () => {
        await this.update()   

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.updateAfterSignIn)
        })
    }

    registerVersionPrompt = () => {
        this.lastAppVersionPrompt = new Date().toISOString();
    }

    promptForRequiredUpdate() {
        this.registerVersionPrompt()

        alertStore().showPrompt({
            title: 'Upgrade Patch',
            message: 'A newer version of Patch has been released. Update to continue using the app',
            actions: [
                {
                    label: 'Okay',
                    onPress: () => {
                        // show them a "you need to upgrade" page...or link to app store?
                    }
                }
            ]
        })
    }

    promptForOptionalUpdate() {
        this.registerVersionPrompt()

        alertStore().showPrompt({
            title: 'New Patch version!',
            message: 'A newer version of Patch has been released. Please update to use the latest functionality',
            actions: [
                {
                    label: 'Okay',
                    onPress: () => {
                        // nothing...can we link them to the app store?
                    }
                }
            ]
        })
    }

    async update(): Promise<void> {
        const config = await api().getDynamicConfig({ token: userStore().authToken });

        runInAction(() => {
            for (const prop in config) {
                this[prop] = config[prop]
            }
        })
    }

    clear() {
        //save values are meant to be forever persistent 
    }
}