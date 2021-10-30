import { injectable } from "inversify";
import { makePersistable } from "mobx-persist-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistentKey } from "../meta";
import { getStore } from "../stores/meta";

export function Service() {
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
                })()

                return initPromise
            }
        }

        return injectable()(ctr)
    }
}

export const getService = getStore;
