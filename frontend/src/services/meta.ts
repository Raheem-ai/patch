import { injectable } from "inversify";
import { getStore } from "../stores/meta";

export function Service() {
    return function(ctr: new () => any) {
        
        const oldInit: Function = ctr.prototype.init;

        let initCalled = false;

        // this isn't really doing anything now but it will come in handy later
        // ...mark.my.words
        ctr.prototype.init = async function() {
            // lets us wait on init without having to worry about erroniously
            // calling it twice
            if (initCalled) {
                return;
            } else {
                initCalled = true;
            }

            if (oldInit) {
                await oldInit.call(this);
            }
        }

        return injectable()(ctr)
    }
}

export const getService = getStore;
