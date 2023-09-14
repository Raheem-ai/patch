import { makeAutoObservable, reaction, runInAction, when } from 'mobx';
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

    //@persistent()
    appVersion: DynamicAppVersionConfig[] = [{
        latestIOS: '',
        latestAndroid: '',
        requiresUpdate: false,
        testing: false
    }]

    @persistent() lastAppVersionPrompt = '' 

    timeBeforeNextPromptInMs = 1000 * 60 * 60 * 24 * 7 // 7 days

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await alertStore().init()
        await this.checkForOverTheAirUpdates()

        // get the latest config before setting up 
        // reactions as they will run immediately
        await api().init()
        await this.updateDynamicConfig()
        
        await this.setupAppVersionChecks()
    }

    get prodAppVersions() {
        return this.appVersion.filter((appVersion) => !appVersion.testing)
    }

    get latestProdAppVersionConfig() {
        return this.prodAppVersions[this.prodAppVersions.length - 1] || null
    }

    get latestProdAppVersion() {
        return this.normalizedVersion(this.latestProdAppVersionConfig)
    }

    get currentVersionConfigIdx() {
        return this.appVersion.findIndex(v => this.normalizedVersion(v) == appRuntimeVersion)
    }

    get currentVersionConfig () {
        return this.currentVersionConfigIdx != -1 
            ? this.appVersion[this.currentVersionConfigIdx]
            : null
    }

    get newerVersionIsRequired() {
        if (this.currentVersionConfig) {
            // for every version after this one, return true if any are required and not a preprod build 
            // logic is inverted because we have to use every()

            const newerVersions = this.prodAppVersions.slice(this.currentVersionConfigIdx + 1)
            const onlyTestingOrOptional = newerVersions.every((version) => version.testing || !version.requiresUpdate)
            
            return !onlyTestingOrOptional
        } else {
            return false
        }
    }

    async setupAppVersionChecks() {

        const couldUpdate = () => {
            const notOnLatestProdVersion = this.latestProdAppVersion && this.latestProdAppVersion != appRuntimeVersion;
            
            const notOnPreProdVersion = this.currentVersionConfig && !this.currentVersionConfig.testing;

            return notOnLatestProdVersion && notOnPreProdVersion && !this.newerVersionIsRequired
        }

        when(couldUpdate, this.promptForOptionalUpdate)

        const needToForceUpdate = () => {
            return this.newerVersionIsRequired
        }

        when(needToForceUpdate, this.promptForRequiredUpdate)

        const calculateApiTag = () => {
            return this.currentVersionConfig?.testing
                ? 'preprod'
                : ''
        }

        const updateApiUrl = (apiTag) => {
            api().pointTo(apiTag)
        }

        //TODO: should be keeping to dispose here?
        reaction(calculateApiTag, updateApiUrl)
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

    normalizedVersion(config: DynamicAppVersionConfig | null) {
        return !!config
            ? isIos
                ? config.latestIOS
                : config.latestAndroid
            : null
    }

    registerVersionPrompt = () => {
        this.lastAppVersionPrompt = new Date().toISOString();
    }

    promptForRequiredUpdate = () => {
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

    promptForOptionalUpdate = () => {
        // if you have already answered the prompt, it will remind you next time you sign in after X time period
        const now = new Date();
            
        const lastPrompt = this.lastAppVersionPrompt 
            ? new Date(this.lastAppVersionPrompt)
            : now

        const waitTime = moment(now).diff(lastPrompt) 
        const waitedLongEnough = waitTime > this.timeBeforeNextPromptInMs;


        if (this.lastAppVersionPrompt && !waitedLongEnough) {
            return
        }

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
        const config = await api().getDynamicConfig();

        runInAction(() => {
            this.appVersion = config.appVersion
        })
    }

    clear() {
        
    }
   
}