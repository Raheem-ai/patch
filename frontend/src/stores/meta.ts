import "reflect-metadata"
import { Container, injectable } from "inversify";
import { makePersistable } from 'mobx-persist-store';
import AsyncStorage from "@react-native-async-storage/async-storage";

const container = new Container({ defaultScope: "Singleton" });

export const persistentKey = Symbol('persistent');

export function getStore<T>({ id }: { id: symbol }): T {
    return container.get(id);
}

export function Store() {
    return function(ctr: new () => any) {
        
        const oldInit = ctr.prototype.init;

        ctr.prototype.init = async function() {
            if (oldInit) {
                await oldInit();
            }

            const persistentProps = ctr.prototype[persistentKey];

            if (persistentProps && persistentProps.length) {
                await makePersistable(this, { 
                    name: ctr.name, 
                    properties: persistentProps,
                    storage: AsyncStorage
                });
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

export default container;