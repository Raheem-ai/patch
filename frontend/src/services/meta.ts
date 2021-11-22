import { injectable } from "inversify";
import { makePersistable } from "mobx-persist-store";
import { persistentKey, PersistentStorage, securelyPersistentKey } from "../meta";
import { getStore } from "../stores/meta";

export function Service({ id }: { id: Symbol }) {
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

                    const allPersistentProps = [...persistentProps, ...securelyPersistentProps]

                    if (allPersistentProps && allPersistentProps.length) {
                        await makePersistable(this, { 
                            name: id.toString(), 
                            properties: allPersistentProps,
                            storage: new PersistentStorage(securelyPersistentProps)
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

export const getService = getStore;
