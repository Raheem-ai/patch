import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { StorageController } from 'mobx-persist-store';

export const persistentPropConfigKey = Symbol('persistentPropConfig');

export type PersistentPropConfig = {
    resolvers?: {
        toJSON: (propValue: any) => Object,
        fromJSON: (Object) => any
    }
}

export type PersistentPropConfigs = {
    [prop: string]: PersistentPropConfig
}

// TODO: this is not letting us differentiate between secure/insecure props...only whole stores but none are secure right now le sigh
export default class PersistentStorage implements StorageController {
    private secureKeySet: Set<string>

    constructor(secureKeys: string[], private propConfigs: PersistentPropConfigs) {
        this.secureKeySet = new Set(secureKeys);
    }

    getItem =  async <T>(key: string) => {
        const res = this.secureKeySet.has(key)
            ? await SecureStore.getItemAsync(key)
            : await AsyncStorage.getItem(key);

        const formattedRes = JSON.parse(res);

        for (const prop in formattedRes) {
            const config = this.propConfigs[prop];
            
            if (config && config.resolvers) {
                formattedRes[prop] = config.resolvers.fromJSON(formattedRes[prop])
            }
        }

        return formattedRes;
    } 

    removeItem = async <T>(key: string) => {
        return this.secureKeySet.has(key)
            ? SecureStore.deleteItemAsync(key)
            : AsyncStorage.removeItem(key);
    }

    setItem = async (key: string, value: any) => {
        for (const prop in value) {
            const config = this.propConfigs[prop];
            
            if (config && config.resolvers) {
                value[prop] = config.resolvers.toJSON(value[prop])
            }
        }

        const formattedValue = JSON.stringify(value);

        return this.secureKeySet.has(key)
            ? SecureStore.setItemAsync(key, formattedValue)
            : AsyncStorage.setItem(key, formattedValue);
    }
}