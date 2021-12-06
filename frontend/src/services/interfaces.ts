import { GeocodeResult, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import { ClientSideApi } from "../../../common/api";

export interface IBaseService {
    init?(): Promise<void>
    clear(): void
}

export interface IMapsService extends IBaseService {
    placeIdToLatLong(placeId: string): Promise<{ lat: number, long: number }>
    latLongToPlace(lat: number, long: number): Promise<GeocodeResult>
    autoCompleteSearch(input: string): Promise<PlaceAutocompleteResult[]>
}

export namespace IMapsService {
    export const id = Symbol('IMapsService');
}

export namespace IAPIService {
    export const id = Symbol('IAPIService');
}

export interface IAPIService extends IBaseService, ClientSideApi<'me' | 'setOnDutyStatus'> {

}

export const AllServices = [
    IMapsService,
    IAPIService
]