import { Container, injectable } from "inversify";
import { getPersistedStore, makePersistable } from 'mobx-persist-store';
import { container, persistentKey, securelyPersistentKey } from "../meta";
import PersistentStorage, { persistentPropConfigKey } from "../meta/persistentStorage";

export function getStore<T>({ id }: { id: symbol }): T {
    return container.get(id);
}
/**
 * 
 *  TODO: 
 *  1) "tracing mode": automatically print start/end of store function calls with getters printing their values
 *  2) easy way to test store logic with initial state, mocked store functions/getters, test actions (scenario), and post checks to what our data should be after test actions
 *  
 */
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
                })().catch(e => {
                    console.log(`Store "${id.toString()}" failed with ${e}`)
                    throw e
                })

                return initPromise
            }
        }

        return injectable()(ctr)
    }
}