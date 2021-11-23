import { runInAction } from "mobx";
import { AllStores, IBaseStore } from "./interfaces";
import { getStore } from "./meta";

export function clearAllStores() {
    runInAction(() => {
        AllStores.forEach(( iStore ) => {
            const store = getStore<IBaseStore>(iStore);
            store.clear();
        })
    });
}