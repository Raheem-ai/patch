import { GeocodeResult, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";

export interface IBaseService {
    init?(): Promise<void>
}

export interface IMapsService extends IBaseService {
    placeIdToLatLong(placeId: string): Promise<{ lat: number, long: number }>
    latLongToPlace(lat: number, long: number): Promise<GeocodeResult>
    autoCompleteSearch(input: string): Promise<PlaceAutocompleteResult[]>
}

export namespace IMapsService {
    export const id = Symbol('IMapsService');
}