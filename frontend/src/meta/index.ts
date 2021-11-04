import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Container } from 'inversify';
import { StorageController } from 'mobx-persist-store';

export const container = new Container({ defaultScope: "Singleton" });

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

export class PersistentStorage implements StorageController {
    private secureKeySet: Set<string>

    constructor(secureKeys: string[]) {
        this.secureKeySet = new Set(secureKeys);
    }

    getItem =  async <T>(key: string) => {
        return this.secureKeySet.has(key)
            ? SecureStore.getItemAsync(key)
            : AsyncStorage.getItem(key);
    } 

    removeItem = async <T>(key: string) => {
        return this.secureKeySet.has(key)
            ? SecureStore.deleteItemAsync(key)
            : AsyncStorage.removeItem(key);
    }

    setItem = async (key: string, value: any) => {
        return this.secureKeySet.has(key)
            ? SecureStore.setItemAsync(key, value)
            : AsyncStorage.setItem(key, value);
    }
}