import { makeAutoObservable, runInAction } from 'mobx';
import {  Store } from './meta';
import { alertStore, IAppUpdateStore, PromptConfig } from './interfaces';
import * as Updates from 'expo-updates';

@Store(IAppUpdateStore)
export default class AppUpdateStore implements IAppUpdateStore {
    waitingForReload = false

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        const updateRes = await Updates.checkForUpdateAsync()

        if (updateRes.isAvailable) {
            runInAction(() => this.waitingForReload = true)
            await Updates.reloadAsync()
        } else {
            Updates.addListener(async (event) => {
                if (event.type == Updates.UpdateEventType.UPDATE_AVAILABLE) {
                    await alertStore().init()

                    const updatePrompt: PromptConfig = {
                        title: 'New update available',
                        message: 'Would you like to reload the latest update?',
                        actions: [
                            {
                                label: 'Update later',
                                onPress: () => {}
                            }, 
                            {
                                label: 'Update now',
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