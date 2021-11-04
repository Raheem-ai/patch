import { APIClient } from "../api";
import { container } from "../meta";
import { GoogleMapsService } from "./googleMapsService";
import { IAPIService, IBaseService, IMapsService } from "./interfaces";
import { getService } from "./meta";

const serviceMappings: [{ id: symbol }, new () => any][] = [
    [ IMapsService, GoogleMapsService ],
    [ IAPIService, APIClient ]
];

export function bindServices() {
    for (const [ iService, service ] of serviceMappings) {
        container.isBound(iService.id) || container.bind(iService.id).to(service).inSingletonScope();
    }
}

export async function initServices() {
    await Promise.all(serviceMappings.map(([ iService, _ ]) => {
        const service = getService<IBaseService>(iService);
        return service.init();
    }));
}