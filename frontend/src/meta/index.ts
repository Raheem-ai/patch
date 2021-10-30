import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { StorageController } from 'mobx-persist-store';

export const persistentKey = Symbol('persistent');

export function persistent(opts?): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        target[persistentKey] = target[persistentKey] ? target[persistentKey] : [];
        target[persistentKey].push(propertyKey);
    }
}

export const securelyPersistentKey = Symbol('securelyPersistent');

export function securelyPersistent(opts?): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        target[securelyPersistentKey] = target[securelyPersistentKey] ? target[securelyPersistentKey] : [];
        target[securelyPersistentKey].push(propertyKey);
    }
}

// TODO: check that SecureStore handles JSON objects gracefully like AsyncStorage does
// so we can confidently save strings and JSON objects with no nested classes
// in a secure way
class PersistentStorage implements StorageController {
    private secureKeySet: Set<string>

    constructor(secureKeys: string[]) {
        this.secureKeySet = new Set(secureKeys);
    }

    async getItem<T>(key: string) {
        return this.secureKeySet.has(key)
            ? SecureStore.getItemAsync(key)
            : AsyncStorage.getItem(key);
    } 
    async removeItem<T>(key: string) {
        return this.secureKeySet.has(key)
            ? SecureStore.deleteItemAsync(key)
            : AsyncStorage.removeItem(key);
    }

    async setItem(key: string, value: any) {
        return this.secureKeySet.has(key)
            ? SecureStore.setItemAsync(key, value)
            : AsyncStorage.setItem(key, value);
    }
}