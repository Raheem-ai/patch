import { runInAction } from "mobx";
import { AllServices, IBaseService } from "./interfaces";
import { getService } from "./meta";

export function clearAllServices() {
    runInAction(() => {
        AllServices.forEach(( iService ) => {
            const service = getService<IBaseService>(iService);
            service.clear();
        })
    });
}