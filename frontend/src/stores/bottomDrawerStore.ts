import {  getStore, Store } from './meta';
import { BottomDrawerComponentClass, BottomDrawerConfig, BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore, IRequestStore } from './interfaces';
import { Animated, Dimensions } from 'react-native';
import { HeaderHeight, InteractiveHeaderHeight } from '../components/header/header';
import { makeAutoObservable, reaction, runInAction } from 'mobx';
import RequestChat from '../components/requestChat';
import EditHelpRequest from '../components/editRequest';
import AssignResponders from '../components/assignResponders';
import CreateHelpRequest from '../components/createRequest';
import { ActiveRequestTabHeight, isAndroid } from '../constants';
import { navigationRef } from '../navigation';
import { routerNames } from '../types';
import Constants from 'expo-constants';
import AddUser from '../components/bottomDrawer/views/addUser';
import EditUser from '../components/bottomDrawer/views/editUser';

const Config: BottomDrawerConfig = {
    [BottomDrawerView.assignResponders]: AssignResponders,
    [BottomDrawerView.createRequest]: CreateHelpRequest,
    [BottomDrawerView.editRequest]: EditHelpRequest,
    [BottomDrawerView.requestChat]: RequestChat,
    [BottomDrawerView.inviteUserToOrg]: AddUser,
    [BottomDrawerView.editMe]: EditUser,
    [BottomDrawerView.editUser]: EditUser
}

const dimensions = Dimensions.get('screen')

@Store(IBottomDrawerStore)
export default class BottomDrawerStore implements IBottomDrawerStore {
    bottomDrawerTabTop = new Animated.Value(dimensions.height)

    currentRoute: string = null;
    expanded: boolean = false;
    showing: boolean = false;
    headerShowing: boolean = false;

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

    get minimizable() {
        return !!this.view && this.isMinimizable(this.view)
    }

    get bottomUIOffset() {
        const onRequestMap = this.currentRoute == routerNames.helpRequestMap;

        return (this.requestStore.activeRequest && !onRequestMap ? ActiveRequestTabHeight : 0)
            + (this.showing && !this.expanded ? BottomDrawerHandleHeight : 0)
    }

    get topUIOffset() {
        return this.showing && this.expanded && this.headerShowing ? BottomDrawerHandleHeight : 0;
    }

    // TODO: there are 2-6ish pixels off here...might be borders adding up or something
    get drawerContentHeight() {
        return Dimensions.get('screen').height 
            - (this.minimizable 
                ? HeaderHeight
                : HeaderHeight - InteractiveHeaderHeight)
            - this.bottomUIOffset 
            - this.topUIOffset;
    }

    show = (view: BottomDrawerView, expanded?: boolean) => {
        const currentIsMinimizeable = this.minimizable;
        const newIsMinimizeable = this.isMinimizable(Config[view]);

        if (currentIsMinimizeable && newIsMinimizeable){
            if (this.viewId == view) {
                runInAction(() => {
                    this.showing = true
                    this.expanded = !!expanded
                    this.headerShowing = true
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
                    this.headerShowing = true
                })
            }
        } else if (currentIsMinimizeable) {
            runInAction(() => {
                this.viewIdStack.push(view);
                this.showing = true;
                this.expanded = !!expanded
                this.headerShowing = true
            })
        } else if (!this.view) {
            runInAction(() => {
                this.viewId = view
                this.showing = true
                this.expanded = !!expanded
                this.headerShowing = true
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

    showHeader = () => {
        this.headerShowing = true;
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

    hideHeader = () => {
        this.headerShowing = false;
    }

    expand = () => {
        Animated.timing(this.bottomDrawerTabTop, {
            toValue: 0 + (this.minimizable
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