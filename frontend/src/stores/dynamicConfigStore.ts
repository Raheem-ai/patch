import { makeAutoObservable, runInAction, when } from "mobx";
import moment from "moment";
import { Linking } from "react-native";
import { DynamicAppVersionConfig } from "../../models";
import STRINGS from "../../../common/strings";
import { androidAppStoreURL, appRuntimeVersion, iosAppStoreURL } from "../config";
import { isIos } from "../constants";
import { persistent } from "../meta";
import { api } from "../services/interfaces";
import { alertStore, IDynamicConfigStore, userStore } from "./interfaces";
import { Store } from "./meta";

@Store(IDynamicConfigStore)
export default class DynamicConfigStore implements IDynamicConfigStore {
    
    @persistent()
    appVersion: DynamicAppVersionConfig[] = [{
        latestIOS: '',
        latestAndroid: '',
        requiresUpdate: false
    }]

    @persistent() lastAppVersionPrompt = '' 

    timeBeforeNextPromptInMs = 1000 * 60 * 60 * 24 * 7 // 7 days

    constructor() {
        makeAutoObservable(this);
    }

    async init() {
        await userStore().init()
        await alertStore().init()

        if (userStore().signedIn) {
            await this.updateAfterSignIn()
        } else {
            when(() => userStore().signedIn, this.updateAfterSignIn)
        }

        const needToUpdate = () => {
            return this.currentAppVersion && this.currentAppVersion != appRuntimeVersion
        }

        when(needToUpdate, this.tryPromptForUpdate)
    }

    get currentAppVersionConfig() {
        return this.appVersion[this.appVersion.length - 1]
    }

    get currentAppVersion() {
        return this.normalizedVersion(this.currentAppVersionConfig)
    }

    normalizedVersion(config: DynamicAppVersionConfig) {
        return isIos
            ? config.latestIOS
            : config.latestAndroid
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

    tryPromptForUpdate = () => {
        /**
         * right now this will happen once you sign in and then whenever the appversion config
         * dynamiclaly changes and this store updates
         */

        // check if any of the versions after the currently installed version required an update
        let updateRequiredInFutureVersion = false;

        for (let i = this.appVersion.length - 1; i >= 0; i--) {
            const config = this.appVersion[i];

            if (appRuntimeVersion == this.normalizedVersion(config)) {
                break;
            } else if (config.requiresUpdate) {
                updateRequiredInFutureVersion = true;
                break;
            }
        }

        if (updateRequiredInFutureVersion) {
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
    }

    promptForRequiredUpdate() {
        this.registerVersionPrompt()

        alertStore().showPrompt({
            title: STRINGS.DYNAMIC_CONFIG.requiredUpdatePrompt.title,
            message: STRINGS.DYNAMIC_CONFIG.requiredUpdatePrompt.message,
            actions: [
                {
                    label: STRINGS.DYNAMIC_CONFIG.requiredUpdatePrompt.updateNow,
                    onPress: () => {
                        const url = isIos ? iosAppStoreURL : androidAppStoreURL;
                        Linking.canOpenURL(url) && Linking.openURL(url)
                    },
                    // block you from doing anything else
                    dontHide: true
                }
            ]
        })
    }

    promptForOptionalUpdate() {
        this.registerVersionPrompt()

        alertStore().showPrompt({
            title: STRINGS.DYNAMIC_CONFIG.optionalUpdatePrompt.title,
            message: STRINGS.DYNAMIC_CONFIG.optionalUpdatePrompt.message,
            actions: [
                {
                    label: STRINGS.DYNAMIC_CONFIG.optionalUpdatePrompt.updateLater,
                    onPress: () => {

                    }
                },
                {
                    label: STRINGS.DYNAMIC_CONFIG.optionalUpdatePrompt.updateNow,
                    onPress: () => {
                        const url = isIos ? iosAppStoreURL : androidAppStoreURL;
                        Linking.canOpenURL(url) && Linking.openURL(url)
                    },
                    confirming: true
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
        // values are meant to be forever persistent 
    }
}