import * as Location from 'expo-location';
import { makeObservable, observable, runInAction } from 'mobx';
import { getStore, Store } from '../di';
import { ILocationStore } from '../interfaces';
import * as TaskManager from 'expo-task-manager';

@Store()
export default class LocationStore implements ILocationStore {

    public hasForegroundPermission: boolean = false;
    public hasBackgroundPermission: boolean = false;

    private locationDestructor: () => Promise<void> = null;

    constructor() {
        makeObservable(this);

        Location.getForegroundPermissionsAsync()
            .then((r) => {
                runInAction(() => this.hasForegroundPermission = r.status == Location.PermissionStatus.GRANTED)
            })
            .catch((e) => {
                console.log(e);
                runInAction(() => this.hasForegroundPermission = false)
            });

        Location.getBackgroundPermissionsAsync()
            .then((r) => {
                runInAction(() => this.hasBackgroundPermission = r.status == Location.PermissionStatus.GRANTED)
            })
            .catch((e) => {
                console.log(e);
                runInAction(() => this.hasBackgroundPermission = false)
            });
    }

    get hasFullPermission(): boolean {
        return this.hasBackgroundPermission && this.hasForegroundPermission
    }

    async askForPermission(): Promise<boolean> {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status !== 'granted') {
                console.log('Permission to access foreground location was denied');
                runInAction(() => this.hasForegroundPermission = false)
                return false;
            } else {
                console.log('Permission granted for foreground location')
                runInAction(() => this.hasForegroundPermission = true)
            }
        } catch (e) {
            console.log('Error requesting foreground location permission: ', e);
            runInAction(() => this.hasForegroundPermission = false)
            return false;
        }

        try {
            let { status : backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            
            if (backgroundStatus !== 'granted') {
                console.log('Permission to access foreground location was denied');
                runInAction(() => this.hasBackgroundPermission = false)
                return false;
            } else {
                console.log('Permission granted for background location')
                runInAction(() => this.hasBackgroundPermission = true)
                return true;
            }
        } catch (e) {
            console.log('Error requesting background location permission: ', e);
            runInAction(() => this.hasBackgroundPermission = false)
            return false;
        }
    }

    async getLocation(): Promise<Location.LocationObject> {
        let location = await Location.getCurrentPositionAsync({
            // should we have any defaults here?
        });
        return location;
    }

    // might need to provide both a foreground and background callback ie. update this map when im using the app
    // update the api (so dispatchers/other responders know where i am) whenever background updates happen
    async watchLocation(cb: (location: Location.LocationObject) => void): Promise<void> {
        const destructor = await Location.watchPositionAsync({
            // should we have any defaults here?
        }, cb);

        // TODO: hookup the callback provided with the callback defined in the background task
        await Location.startLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
        });
        
        this.locationDestructor = async () => {
            destructor.remove()

            try {
                await Location.stopLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK)
            } catch (e) {
                console.log('Error stopping background location updates: ', e);
            }
        };
    }

    async stopWatchingLocation() {
        if (this.locationDestructor) {
            await this.locationDestructor()
            this.locationDestructor = null;
        }
    }
}

TaskManager.defineTask(ILocationStore.BACKGROUND_LOCATION_TASK, ({ data, error }) => {
    const locationStore = getStore<ILocationStore>(ILocationStore);
    
    if (error) {
      // Error occurred - check `error.message` for more details.
      console.log(error)
      return;
    }
    if (data) {
        console.log(data)
    //   const { locations } = data;
      // do something with the locations captured in the background
    }
  });