import * as ExpoLocation from 'expo-location';
import { LocationObject } from 'expo-location';
import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { ILocationStore, IUserStore, locationStore, userStore } from './interfaces';
import * as TaskManager from 'expo-task-manager';
import { TaskManagerTaskBody } from 'expo-task-manager';
import * as uuid from 'uuid';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from '../../../common/models';
import { api } from '../services/interfaces';
import { Camera } from 'react-native-maps';

@Store(ILocationStore)
export default class LocationStore implements ILocationStore {
    public hasForegroundPermission = false;
    
    public hasBackgroundPermission = false;
    
    public lastKnownLocation: Location = null;

    public defaultCamera: Camera = {
        center: {
            latitude: 29.998258850010608,
            longitude: -98.68551313877106
        },
        zoom: 3,
        altitude: 0,
        pitch: 0,
        heading: 0
    }

    public foregroundCallbacksMap: Map<string, (loc: LocationObject) => void> = new Map();
    
    private locationDestructor: () => void = null;

    constructor() {
        makeAutoObservable(this, {
            defaultCamera: false
        });
    }

    clear() {
        this.lastKnownLocation = null;
    }

    async init() {
        try {
            const r = await ExpoLocation.getForegroundPermissionsAsync()
            runInAction(() => this.hasForegroundPermission = r.status == ExpoLocation.PermissionStatus.GRANTED)
        } catch (e) {
            runInAction(() => this.hasForegroundPermission = false)
        }

        try {
            const r = await ExpoLocation.getBackgroundPermissionsAsync()
            runInAction(() => this.hasBackgroundPermission = r.status == ExpoLocation.PermissionStatus.GRANTED)
        } catch (e) {
            runInAction(() => this.hasBackgroundPermission = false)
        }

        setTimeout(() => {
            if (this.hasForegroundPermission) {
              // not awaiting this but kicking it off here so any map views that 
              // need your current location get a head start on loading it
              this.getCurrentLocation()
            }
        }, 0);
    }

    get foregroundCallbacks() {
        return Array.from(this.foregroundCallbacksMap.values())
    }

    get hasFullPermission(): boolean {
        return this.hasBackgroundPermission && this.hasForegroundPermission
    }

    async askForPermission(): Promise<boolean> {
        try {
            let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
            
            if (status !== ExpoLocation.PermissionStatus.GRANTED) {
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
            console.log('asking for baclground')
            let { status : backgroundStatus } = await ExpoLocation.requestBackgroundPermissionsAsync();
            
            if (backgroundStatus !== ExpoLocation.PermissionStatus.GRANTED) {
                console.log('Permission to access background location was denied');
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

    async getCurrentLocation(): Promise<LocationObject> {
        let location = await ExpoLocation.getCurrentPositionAsync({
            // should we have any defaults here?
        });

        runInAction(() => {
            this.lastKnownLocation = location
        })

        return location;
    }

    async startWatchingLocation(): Promise<void> {
        if (!this.hasFullPermission) {
            await this.askForPermission();
        }
        
        // already running in foreground 
        if (!this.locationDestructor) {
            const destructor = await ExpoLocation.watchPositionAsync({
                // should we have any defaults here?
            }, (loc: LocationObject) => {
                runInAction(()=> {
                    this.lastKnownLocation = loc
                })

                for (const cb of this.foregroundCallbacks) {
                    // intentionally not awaiting here so we can trace when an error happens...provided  cbs 
                    // should handle their error cases
                    cb(loc)
                }
            });

            // marks as running in foreground
            this.locationDestructor = destructor.remove;
        }

        // let background task know it should run
        await AsyncStorage.setItem(ILocationStore.BACKGROUND_LOCATION_TASK, JSON.stringify(true));
    }

    async stopWatchingLocation() {
        if (this.locationDestructor) {
            this.locationDestructor()
            this.locationDestructor = null;
        }

        await AsyncStorage.setItem(ILocationStore.BACKGROUND_LOCATION_TASK, JSON.stringify(false));
    }

    addForegroundCallback(cb: (loc: LocationObject) => Promise<void> | void) {
        const handle = uuid.v1();
        this.foregroundCallbacksMap.set(handle, cb);

        return handle;
    }

    removeForegroundCallback(handle: string) {
        if (this.foregroundCallbacksMap.has(handle)) {
            this.foregroundCallbacksMap.delete(handle);
        }
    }

    async reportLocation(token: string, locations: Location[]) {
        await api().reportLocation({ token }, locations);
    }
}

TaskManager.defineTask(ILocationStore.BACKGROUND_LOCATION_TASK, async ({ data, error }: TaskManagerTaskBody<{ locations: LocationObject[] }>) => {
    const shiftEndTime = JSON.parse((await AsyncStorage.getItem(ILocationStore.SHIFT_END_TIME)));

    if (new Date().getTime() > shiftEndTime && (await ExpoLocation.hasStartedLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK))) {
        await ExpoLocation.stopLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK);
    }

    if (error) {
      console.error(error)
      return;
    }

    if (data && data.locations && data.locations.length) {
        // background tasks start the app but render nothing so the store is being created anew each time
        // need to use storage + canned background tasks types to facilitate turning background tings on and off
        await userStore().init(); // make sure token is populated
        await locationStore().reportLocation(userStore().authToken, data.locations)
    }
});

AppState.addEventListener('change', async (state: AppStateStatus) => {
    const shiftEndTime = JSON.parse((await AsyncStorage.getItem(ILocationStore.SHIFT_END_TIME)));

    const runInBackground = await AsyncStorage.getItem(ILocationStore.BACKGROUND_LOCATION_TASK);
    const duringShift = new Date().getTime() < shiftEndTime;

    if (
        state == 'active'  
            && (await ExpoLocation.hasStartedLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK))
    ) {
        await ExpoLocation.stopLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK)    
    } else if (
        state == 'background' 
            && runInBackground 
            && JSON.parse(runInBackground) 
            && duringShift
    ) {
        await ExpoLocation.startLocationUpdatesAsync(ILocationStore.BACKGROUND_LOCATION_TASK, {
            accuracy: ExpoLocation.Accuracy.Balanced,
        });
    }
})