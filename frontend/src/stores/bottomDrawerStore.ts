import {  getStore, Store } from './meta';
import { BottomDrawerComponentClass, BottomDrawerConfig, BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore, IRequestStore } from './interfaces';
import { Alert, Animated, Dimensions } from 'react-native';
import { persistent } from '../meta';
import { HeaderHeight, InteractiveHeaderHeight } from '../components/header/header';
import { autorun, makeAutoObservable, reaction, runInAction, when } from 'mobx';
import RequestChat from '../components/requestChat';
import EditHelpRequest from '../components/editRequest';
import AssignResponders from '../components/assignResponders';
import CreateHelpRequest from '../components/createRequest';
import { ActiveRequestTabHeight, isAndroid } from '../constants';
import { navigationRef } from '../navigation';
import { routerNames } from '../types';
import { constants } from 'buffer';
import Constants from 'expo-constants';

const Config: BottomDrawerConfig = {
    [BottomDrawerView.assignResponders]: AssignResponders,
    [BottomDrawerView.createRequest]: CreateHelpRequest,
    [BottomDrawerView.editRequest]: EditHelpRequest,
    [BottomDrawerView.requestChat]: RequestChat
}

const dimensions = Dimensions.get('screen')

@Store(IBottomDrawerStore)
export default class BottomDrawerStore implements IBottomDrawerStore {
    bottomDrawerTabTop = new Animated.Value(dimensions.height)

    currentRoute: string = null;
    expanded: boolean = false;
    showing: boolean = false;

    viewIdStack: BottomDrawerView[] = []

    private requestStore = getStore<IRequestStore>(IRequestStore);

    constructor() {
        makeAutoObservable(this)

        // Bottom drawer does not have access to navigation props/hooks so handling it here
        reaction(() => this.currentRoute, (newRoute, prevRoute) => {
           if ((prevRoute == routerNames.helpRequestMap || newRoute == routerNames.helpRequestMap) && this.showing) {
                this.minimize()
            }
        })
    }

    get viewId() {
        return this.viewIdStack.length 
            ? this.viewIdStack[this.viewIdStack.length - 1]
            : null
    }

    set viewId(id: BottomDrawerView) {
        if (this.viewIdStack.length) {
            this.viewIdStack[this.viewIdStack.length - 1] = id;
        } else {
            this.viewIdStack.push(id);
        }
    }

    get view() {
        if (!this.viewId) {
            return null
        }

        return Config[this.viewId] || null
    }

    show = (view: BottomDrawerView, expanded?: boolean) => {
        const currentIsMinimizeable = this.view && this.isMinimizable(this.view);
        const newIsMinimizeable = this.isMinimizable(Config[view]);

        if (currentIsMinimizeable && newIsMinimizeable){
            if (this.viewId == view) {
                runInAction(() => {
                    this.showing = true
                    this.expanded = !!expanded
                })
            } else {
                // TODO: test this when we have another minimizeable view
                runInAction(() => {
                    const idx = this.viewIdStack.findIndex(v => v == view);

                    if (idx < 0) {
                        // not already in stack so add it
                        this.viewIdStack.push(view);
                    } else {
                        // already in stack so move it to the front
                        this.viewIdStack.splice(idx, 1);
                        this.viewIdStack.push(view);
                    }
                    
                    this.showing = true
                    this.expanded = !!expanded
                })
            }
        } else if (currentIsMinimizeable) {
            runInAction(() => {
                this.viewIdStack.push(view);
                this.showing = true;
                this.expanded = !!expanded
            })
        } else if (!this.view) {
            runInAction(() => {
                this.viewId = view
                this.showing = true
                this.expanded = !!expanded
            })
        }

        Animated.timing(this.bottomDrawerTabTop, {
            toValue: !!expanded 
                ? 0 + (newIsMinimizeable
                    ? HeaderHeight
                    : isAndroid 
                        // NOTE: no idea why a random 12 pixels is being removed...
                        // ESPECIALLY because minimizable views go exactly where they need
                        ? Constants.statusBarHeight + 1 + 12 
                        : InteractiveHeaderHeight)
                : dimensions.height - HeaderHeight - BottomDrawerHandleHeight,
            duration: 300,
            useNativeDriver: false // native can't handle layout animations
        }).start();

        this.view.onShow?.()
    }

    hide = () => {
        if (this.viewIdStack.length > 1) {
            const oldView = this.viewIdStack.pop();

            this.minimize(() => {
                runInAction(() => {
                    Config[oldView].onHide?.()
                })
            })

            return;
        }

        Animated.timing(this.bottomDrawerTabTop, {
            toValue: dimensions.height,
            duration: 300,
            useNativeDriver: false // native can't handle layout animations
        }).start((res) => {
            this.view.onHide?.()

            runInAction(() => {
                this.viewId = null
            })
        })

        runInAction(() => {
            this.showing = false
            this.expanded = false
        })
    }

    expand = () => {
        const isMinimizable = this.view.minimizeLabel
            ? typeof this.view.minimizeLabel == 'function'
                ? (this.view.minimizeLabel as () => string)()
                : this.view.minimizeLabel
            : false;

        Animated.timing(this.bottomDrawerTabTop, {
            toValue: 0 + (isMinimizable
                ? HeaderHeight // should only run this one as you can only expand from being minimized
                : isAndroid 
                    ? Constants.statusBarHeight + 1 + 12 
                    : InteractiveHeaderHeight),
            duration: 300,
            useNativeDriver: false // native can't handle layout animations
        }).start();

        runInAction(() => {
            this.showing = true
            this.expanded = true
        })
    }

    minimize = (cb?: () => void) => {
        const onRequestMap = navigationRef.current?.getCurrentRoute().name == routerNames.helpRequestMap;
        
        Animated.timing(this.bottomDrawerTabTop, {
            toValue: dimensions.height 
                - BottomDrawerHandleHeight 
                - ((this.requestStore.activeRequest && !onRequestMap)  ? ActiveRequestTabHeight : 0)
                - (isAndroid ? Constants.statusBarHeight - 1 : 0),
            duration: 300,
            useNativeDriver: false // native can't handle layout animations
        }).start((_) => {
            cb?.()
        });

        runInAction(() => {
            this.showing = true
            this.expanded = false
        })
    }

    isMinimizable = (view: BottomDrawerComponentClass) => {
        return view.minimizeLabel
            ? typeof view.minimizeLabel == 'function'
                ? !!(view.minimizeLabel as () => string)()
                : !!view.minimizeLabel
            : false;
    }
    
    clear() {

    }
}