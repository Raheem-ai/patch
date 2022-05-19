import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { INavigationStore } from './interfaces';
import { navigateTo, navigationRef } from '../navigation';
import { RootStackParamList } from '../types';
import { NavigationContainerEventMap } from '@react-navigation/native';


@Store(INavigationStore)
export default class NavigationStore implements INavigationStore {
    currentRoute: keyof RootStackParamList = null;

    constructor() {
        makeAutoObservable(this)
    }

    async init() {

    }

    clear() {
        runInAction(() => {
            this.currentRoute = null
        })
    }

    async navigateToSync<Route extends keyof RootStackParamList>(targetRoute: Route) {
        navigateTo(targetRoute);

        await when(() => {
            console.log('WHEN: ', this.currentRoute, targetRoute);
            return this.currentRoute == targetRoute
        });
    }
}