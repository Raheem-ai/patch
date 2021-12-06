import { makeAutoObservable } from 'mobx';
import { IMapsService } from './interfaces';
import { Service } from './meta';
import {Client, GeocodeResult, PlaceAutocompleteRequest, PlaceAutocompleteResult} from "@googlemaps/google-maps-services-js";
import { ILocationStore, ISecretStore } from '../stores/interfaces';
import { getStore } from '../stores/meta';


const MetersPerMile = 1609.34;

@Service(IMapsService)
export class GoogleMapsService implements IMapsService {
    private client: Client = new Client({});

    private locationStore = getStore<ILocationStore>(ILocationStore);
    private secretStore = getStore<ISecretStore>(ISecretStore);

    private maxSearchRadius = MetersPerMile * 100; // 100 mile search radius

    constructor() {
        makeAutoObservable(this);
    }

    async init() {
        await this.secretStore.init();
    }

    clear() {
        
    }

    async placeIdToLatLong(placeId: string): Promise<{ lat: number, long: number }> {
        try {
            console.log(placeId)

            const response = await this.client.placeDetails({
                params: {
                    key: this.secretStore.googleMapsApiKey || '',
                    place_id: placeId,
                    fields: ['geometry']
                }
            });

            if (response.status !== 200) {
                console.error(response.status, response.statusText)
                console.log(response.data)
            }

            const result = response.data.result;

            return {
                lat: result.geometry.location.lat,
                long: result.geometry.location.lng
            }
        } catch (e) {
            console.error(e)
        }
    }

    async autoCompleteSearch(input: string): Promise<PlaceAutocompleteResult[]> {
        const params: PlaceAutocompleteRequest = {
            params: {
                input,
                key: this.secretStore.googleMapsApiKey || ''
            }
        };

        if (this.locationStore.lastKnownLocation) {
            const loc = this.locationStore.lastKnownLocation;

            params.params.location = {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
            }

            params.params.radius = this.maxSearchRadius

            // params.params.strictbounds = true
        }

        const results = await this.client.placeAutocomplete(params);

        return results.data.predictions;
    }

    async latLongToPlace(lat: number, long: number): Promise<GeocodeResult> {
        const result = await this.client.reverseGeocode({
            params: {
                key: this.secretStore.googleMapsApiKey || '',
                latlng: {
                    lat: lat,
                    lng: long
                }
            }
        });
        
        return result.data.results[0];
    }


    // async init() {
    //     try {
    //         this.google = await new Loader({
    //             apiKey,
    //             version: 'quarterly'
    //         }).load();

    //         this.geocoder = new this.google.maps.Geocoder();
    //         console.log(this.geocoder)
    //     } catch (e) {
    //         console.error(e);
    //         console.log('in init')
    //         this.google = null;
    //     }
    // }

    // addressToLatLong(address: string): Promise<{ address: string, lat: number, long: number }[]> {
    //     return new Promise((resolve, reject) => {
    //         this.geocoder.geocode({ address }, (results, status) => {
    //             if (status == google.maps.GeocoderStatus.OK) {
    //                 resolve(results.map(r => {
    //                     return {
    //                         address: r.formatted_address,
    //                         lat: r.geometry.location.lat(),
    //                         long: r.geometry.location.lng()
    //                     }
    //                 }))
    //             } else {
    //                 console.error(status);
    //                 reject(status);
    //             }
    //         })
    //     })
    // }
}