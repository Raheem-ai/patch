import { Store } from './meta';
import { BottomDrawerComponentClass, BottomDrawerConfig, BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore, INativeEventStore, IRequestStore, nativeEventStore, navigationStore, requestStore, userStore } from './interfaces';
import { Animated, Dimensions } from 'react-native';
import { HeaderHeight, InteractiveHeaderHeight } from '../components/header/header';
import { makeAutoObservable, reaction, runInAction, when } from 'mobx';
import RequestChat from '../components/bottomDrawer/views/requestChat';
import EditHelpRequest from '../components/bottomDrawer/views/editRequest';
import AssignResponders from '../components/bottomDrawer/views/assignResponders';
import CreateHelpRequest from '../components/bottomDrawer/views/createRequest';
import { ActiveRequestTabHeight, isAndroid } from '../constants';
import { navigationRef } from '../navigation';
import { routerNames } from '../types';
import Constants from 'expo-constants';
import AddUser from '../components/bottomDrawer/views/addUser';
import EditUser from '../components/bottomDrawer/views/editUser';
import { BOTTOM_BAR_HEIGHT } from '../utils/dimensions';

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

    activeRequestOffset = new Animated.Value(0)
    minimizedHandleOffset = new Animated.Value(0)
    headerOffset = new Animated.Value(0)
    topUIOffset = new Animated.Value(0)
    bottomUIOffset = Animated.add(this.activeRequestOffset, this.minimizedHandleOffset)

    // TODO: should probably offload some of this to a layout store because having calculations for
    // non bottom drawer content height here is weird
    contentHeight = new Animated.Value(0)
    drawerContentHeight = new Animated.Value(0)

    expanded: boolean = false;
    showing: boolean = false;
    headerShowing: boolean = false;

    viewIdStack: BottomDrawerView[] = []

    disposeOfAnimationReactions: () => void = null;

    // private requestStore = getStore<IRequestStore>(IRequestStore);
    // private nativeEventStore = getStore<INativeEventStore>(INativeEventStore);


    constructor() {
        makeAutoObservable(this)

        // Bottom drawer does not have access to navigation props/hooks so handling it here
        reaction(() => navigationStore().currentRoute, (newRoute, prevRoute) => {
           if ((prevRoute == routerNames.helpRequestMap || newRoute == routerNames.helpRequestMap) && this.showing) {
                this.minimize()
            }
        })
    }

    async init() {
        await nativeEventStore().init();
        await requestStore().init();
        await userStore().init();
        await navigationStore().init();

        if (userStore().signedIn) {
            this.setupAnimationReactions()
        } else {
            when(() => userStore().signedIn, this.setupAnimationReactions)
        }
        
    }

    setupAnimationReactions = () => {
        const disposers = [
            // reactively update content height based on bottom drawer + keyboard state
            reaction(this.calculateContentHeight, this.animateContentHeight, {
                equals: (a, b) => a[0] == b[0] && a[1] == b[1],
                fireImmediately: true
            }),      
            // animate to correct new height as activeRequest might have toggled existing
            reaction(() => { requestStore().activeRequest }, (_) => {
                if (this.showing && !this.expanded) {
                    this.minimize()
                }
            })
        ]
        
        this.disposeOfAnimationReactions = () => {
            disposers.forEach(d => d());
        }

        when(() => !userStore().signedIn, () => {
            this.disposeOfAnimationReactions?.();
            when(() => userStore().signedIn, this.setupAnimationReactions)
        })
    }

    calculateContentHeight = (): [number, number] => {
        const topUIOffset = this.minimizable
            ? HeaderHeight
            : HeaderHeight - InteractiveHeaderHeight;

        const internalHeaderOffset = this.expandedHeaderShowing
            ? BottomDrawerHandleHeight
            : 0;

        const minimizedHandleOffset = this.minimizedHandleShowing
            ? BottomDrawerHandleHeight
            : 0;

        const activeRequestOffset = this.activeRequestShowing
            ? ActiveRequestTabHeight
            : 0; 

        const bottomUIOffset = activeRequestOffset + minimizedHandleOffset + (isAndroid ? BOTTOM_BAR_HEIGHT : 0);

        const contentHeight = dimensions.height - HeaderHeight - bottomUIOffset - nativeEventStore().keyboardHeight;

        const bottomDrawerContentHeight = dimensions.height - topUIOffset - internalHeaderOffset - bottomUIOffset - nativeEventStore().keyboardHeight

        return [contentHeight, bottomDrawerContentHeight]
    }

    animateContentHeight = ([contentHeight, drawerContentHeight]) => {
        Animated.parallel([
            Animated.timing(this.contentHeight, {
                toValue: contentHeight,
                duration: 300,
                useNativeDriver: false
            }),
            Animated.timing(this.drawerContentHeight, {
                toValue: drawerContentHeight,
                duration: 300,
                useNativeDriver: false
            })
        ]).start()
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

    get activeRequestShowing() {
        const onRequestMap = navigationStore().currentRoute == routerNames.helpRequestMap;
        return requestStore().activeRequest && !onRequestMap && !nativeEventStore().keyboardOpen;
    }

    get minimizedHandleShowing() {
        return this.showing && !this.expanded;
    }

    get expandedHeaderShowing() {
        return this.showing && this.expanded && this.headerShowing;
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
                        ? Constants.statusBarHeight
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
                    ? Constants.statusBarHeight
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
                - ((requestStore().activeRequest && !onRequestMap)  ? ActiveRequestTabHeight : 0)
                - (isAndroid ? BOTTOM_BAR_HEIGHT : 0),
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