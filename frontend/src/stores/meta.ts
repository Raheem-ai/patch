import "reflect-metadata"
import { Container, injectable } from "inversify";
import { makePersistable, StorageController } from 'mobx-persist-store';
import AsyncStorage from "@react-native-async-storage/async-storage";

const container = new Container({ defaultScope: "Singleton" });

export const persistentKey = Symbol('persistent');

export function getStore<T>({ id }: { id: symbol }): T {
    return container.get(id);
}

export function Store() {
    return function(ctr: new () => any) {
        
        const oldInit: Function = ctr.prototype.init;

        let initCalled = false;

        ctr.prototype.init = async function() {
            // lets us wait on init without having to worry about erroniously
            // calling it twice
            if (initCalled) {
                return;
            } else {
                initCalled = true;
            }

            const persistentProps = ctr.prototype[persistentKey];

            if (persistentProps && persistentProps.length) {
                await makePersistable(this, { 
                    name: ctr.name, 
                    properties: persistentProps,
                    storage: AsyncStorage
                });
            }

            if (oldInit) {
                await oldInit.call(this);
            }
        }

        return injectable()(ctr)
    }
}

export function persistent(opts?): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        target[persistentKey] = target[persistentKey] ? target[persistentKey] : [];
        target[persistentKey].push(propertyKey);
    }
}

// const AsyncStorageWrapper: StorageController = {
//     getItem: async <T>(key: string) => {
//         const json = await AsyncStorage.getItem(key);

//         if (!json) {
//             return json;
//         }

//     }, 
//     removeItem: async <T>(key: string): Promise<T> {

//     }, 
//     setItem: async <T>(key: string, value: T): Promise<T> {

//     }
// }

export default container;