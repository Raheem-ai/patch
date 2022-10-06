import { Container, injectable } from "inversify";
import { getPersistedStore, makePersistable } from 'mobx-persist-store';
import { container, persistentKey, securelyPersistentKey } from "../meta";
import PersistentStorage, { persistentPropConfigKey } from "../meta/persistentStorage";

export function getStore<T>({ id }: { id: symbol }): T {
    return container.get(id);
}

export function Store({ id }: { id: Symbol }) {
    return function(ctr: new () => any) {
        
        const oldInit: Function = ctr.prototype.init;

        let initPromise: Promise<void>;

        ctr.prototype.init = async function() {
            // lets us wait on init without having to worry about erroniously
            // calling it twice
            if (!!initPromise) {
                return initPromise;
            } else {
                initPromise = (async () => {
                    const persistentProps = ctr.prototype[persistentKey] || [];
                    const securelyPersistentProps = ctr.prototype[securelyPersistentKey] || [];
                    const persistentPropConfigs = ctr.prototype[persistentPropConfigKey] || {};

                    const allPersistentProps = [...persistentProps, ...securelyPersistentProps]

                    if (allPersistentProps && allPersistentProps.length) {
                        await makePersistable(this, { 
                            // to get around the minification of constructor names for prod
                            name: id.toString(), 
                            properties: allPersistentProps,
                            stringify: false,
                            storage: new PersistentStorage(securelyPersistentProps, persistentPropConfigs)
                        });
                    }

                    if (oldInit) {
                        await oldInit.call(this);
                    }
                })()

                return initPromise
            }
        }

        return injectable()(ctr)
    }
}