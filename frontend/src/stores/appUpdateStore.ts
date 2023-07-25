import { makeAutoObservable, runInAction, when } from 'mobx';
import {  Store } from './meta';
import { alertStore, IAppUpdateStore, PromptConfig } from './interfaces';
import * as Updates from 'expo-updates';
import { androidAppStoreURL, appRuntimeVersion, inDevApp, iosAppStoreURL } from '../config';
import STRINGS from '../../../common/strings';
import { persistent } from '../meta';
import { DynamicAppVersionConfig, DynamicConfig } from '../../models';
import { isIos } from '../constants';
import { Linking } from 'react-native';
import moment from 'moment';
import { api } from '../services/interfaces';

@Store(IAppUpdateStore)
export default class AppUpdateStore implements IAppUpdateStore {
    waitingForReload = false

    @persistent()
    appVersion: DynamicAppVersionConfig[] = [{
        latestIOS: '',
        latestAndroid: '',
        requiresUpdate: false
    }]

    @persistent() lastAppVersionPrompt = '' 

    timeBeforeNextPromptInMs = 1000 * 60 * 60 * 24 * 7 // 7 days

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await this.checkForOverTheAirUpdates();
        await alertStore().init()
        await this.checkForNewerAppVersions()
    }

    get currentAppVersionConfig() {
        return this.appVersion[this.appVersion.length - 1]
    }

    get currentAppVersion() {
        return this.normalizedVersion(this.currentAppVersionConfig)
    }

    async checkForNewerAppVersions() {

        const needToUpdate = () => {
            return this.currentAppVersion && this.currentAppVersion != appRuntimeVersion
        }

        when(needToUpdate, this.tryPromptForUpdate)

        await this.updateDynamicConfig()
    }

    async checkForOverTheAirUpdates() {
        if (inDevApp) {
            return; // can't check for updates in dev app
        }
        
        const updateRes = await Updates.checkForUpdateAsync()

        if (updateRes.isAvailable) {
            runInAction(() => this.waitingForReload = true)
            // await Updates.fetchUpdateAsync()
            await Updates.reloadAsync()
        } else {
            // TODO: this doesn't seem to be working for some reason
            Updates.addListener(async (event) => {
                if (event.type == Updates.UpdateEventType.UPDATE_AVAILABLE) {
                    await alertStore().init()

                    const updatePrompt: PromptConfig = {
                        title: STRINGS.APP_UPDATES.prompt.title,
                        message: STRINGS.APP_UPDATES.prompt.message,
                        actions: [
                            {
                                label: STRINGS.APP_UPDATES.prompt.updateLater,
                                onPress: () => {}
                            }, 
                            {
                                label: STRINGS.APP_UPDATES.prompt.updateNow,
                                onPress: async () => {
                                    await Updates.reloadAsync()
                                },
                                confirming: true
                            }
                        ]
                    }

                    alertStore().showPrompt(updatePrompt)
                }
            })
        }
    }

    normalizedVersion(config: DynamicAppVersionConfig) {
        return isIos
            ? config.latestIOS
            : config.latestAndroid
    }

    registerVersionPrompt = () => {
        this.lastAppVersionPrompt = new Date().toISOString();
    }

    tryPromptForUpdate = () => {
        /**
         * right now this will run whenever you reopen the app and see 
         * you have an old version or whenever the appVersion config
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
        }, true)
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
        }, true)
    }

    async updateDynamicConfig(): Promise<void> {
        await api().init()
        const config = await api().getDynamicConfig();

        runInAction(() => {
            this.appVersion = config.appVersion
        })
    }

    clear() {
        
    }
   
}