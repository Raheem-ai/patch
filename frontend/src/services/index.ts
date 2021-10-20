import container, { getStore } from "../stores/meta";
import { GoogleMapsService } from "./googleMapsService";
import { IBaseService, IMapsService } from "./interfaces";
import { getService } from "./meta";

const serviceMappings: [{ id: symbol }, new () => any][] = [
    [ IMapsService, GoogleMapsService ]
];

export function bindServices() {
    for (const [ iService, service ] of serviceMappings) {
        container.bind(iService.id).to(service).inSingletonScope();
    }
}

export async function initServices() {
    await Promise.all(serviceMappings.map(([ iService, _ ]) => {
        const service = getService<IBaseService>(iService);
        return service.init();
    }));
}

bindServices();