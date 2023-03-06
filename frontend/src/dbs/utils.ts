import { runInAction } from "mobx";
import { AllDBs, IBaseDB } from "./interfaces";
import { getDB } from "./meta";

export function clearAllDBs() {
    runInAction(() => {
        AllDBs.forEach(( iStore ) => {
            const store = getDB<IBaseDB>(iStore);
            store.clear();
        })
    });
}