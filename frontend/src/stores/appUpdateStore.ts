import { makeAutoObservable, runInAction } from 'mobx';
import {  Store } from './meta';
import { alertStore, IAppUpdateStore, PromptConfig } from './interfaces';
import * as Updates from 'expo-updates';
import { inDevApp } from '../config';
import STRINGS from '../../../common/strings';

@Store(IAppUpdateStore)
export default class AppUpdateStore implements IAppUpdateStore {
    waitingForReload = false

    constructor() {
        makeAutoObservable(this)
    }

    async init() {

        if (inDevApp) {
            return; // can't check for updates in dev app
        }
        
        const updateRes = await Updates.checkForUpdateAsync()

        if (updateRes.isAvailable) {
            runInAction(() => this.waitingForReload = true)
            await Updates.fetchUpdateAsync()
            await Updates.reloadAsync()
        } else {
            // this doesn't seem to be working for some reason
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

    clear() {
        
    }
   
}