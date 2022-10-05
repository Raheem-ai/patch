import { Store } from './meta';
import { BottomDrawerComponentClass, BottomDrawerConfig, BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore, INativeEventStore, IRequestStore, nativeEventStore, navigationStore, requestStore, userStore } from './interfaces';
import { Animated, Dimensions, Keyboard } from 'react-native';
import { makeAutoObservable, reaction, runInAction, when } from 'mobx';
import EditHelpRequest from '../components/bottomDrawer/views/editRequest';
import AssignResponders from '../components/bottomDrawer/views/assignResponders';
import CreateHelpRequest from '../components/bottomDrawer/views/createRequest';
import { ActiveRequestTabHeight, HeaderHeight, InteractiveHeaderHeight, isAndroid } from '../constants';
import { RootStackParamList, routerNames } from '../types';
import Constants from 'expo-constants';
import AddUser from '../components/bottomDrawer/views/addUser';
import EditUser from '../components/bottomDrawer/views/editUser';
import { BOTTOM_BAR_HEIGHT } from '../utils/dimensions';

/**
 * open minimizable view
 * close it
 * open non-minimizable view
 */

const Config: BottomDrawerConfig = {
    [BottomDrawerView.assignResponders]: AssignResponders,
    [BottomDrawerView.createRequest]: CreateHelpRequest,
    [BottomDrawerView.editRequest]: EditHelpRequest,
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
    submitting: boolean = false;

    viewIdStack: BottomDrawerView[] = []

    disposeOfAnimationReactions: () => void = null;

    get disabledRoutes() {
        const routes = new Set();

        this.disabledActiveRequestRoutes.forEach(r => routes.add(r))
        this.disabledDrawerRoutes.forEach(r => routes.add(r))

        return Array.from(routes.values())
    }

    private disabledActiveRequestRoutes: (keyof RootStackParamList)[] = [
        routerNames.helpRequestMap,
        routerNames.helpRequestChat,
        routerNames.userHomePage,
        routerNames.updatePassword,
        routerNames.sendResetCode
    ]

    private disabledDrawerRoutes: (keyof RootStackParamList)[] = [
        routerNames.helpRequestChat
    ]

    constructor() {
        makeAutoObservable(this)
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

    startSubmitting = () => {
        this.submitting = true
    }

    endSubmitting = () => {
        this.submitting = false
    }

    setupAnimationReactions = () => {
        const disposers = [
            // reactively update content height based on bottom drawer + active request state
            reaction(this.calculateContentHeight, this.animateContentHeight, {
                equals: (a, b) => a[0] == b[0] && a[1] == b[1] && a[2] == b[2],
                fireImmediately: true
            }),      
            // animate to correct new height as activeRequest might have toggled existing
            // reaction(() => { return requestStore().activeRequest }, (_) => {
            reaction(() => { return this.activeRequestShowing }, (_) => {
                if (this.showing && !this.expanded) {
                    // don't effect keyboard as you can be taken off a request in the background while
                    // editing something unrelated
                    this._minimize() 
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

    calculateContentHeight = (): [number, number, string] => {
        const topUIOffset = this.minimizable
            ? HeaderHeight
            : HeaderHeight - InteractiveHeaderHeight;

        const minimizedHandleOffset = this.minimizedHandleShowing
            ? BottomDrawerHandleHeight
            : 0;

        const activeRequestOffset = this.activeRequestShowing
            ? ActiveRequestTabHeight
            : 0; 

        const bottomUIOffset = activeRequestOffset + minimizedHandleOffset + (isAndroid ? BOTTOM_BAR_HEIGHT : 0);

        const contentHeight = dimensions.height - HeaderHeight - bottomUIOffset

        const bottomDrawerContentHeight = dimensions.height - topUIOffset - bottomUIOffset 

        return [contentHeight, bottomDrawerContentHeight, this.viewId]
    }

    animateContentHeight = ([contentHeight, drawerContentHeight, viewId]) => {
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
        return requestStore().activeRequest && this.activeRequestShouldShow;
    }

    get activeRequestShouldShow() {
        const onDisabledRoute = this.disabledActiveRequestRoutes.includes(navigationStore().currentRoute)
        const onActiveRequestDetails = navigationStore().currentRoute == routerNames.helpRequestDetails 
            && requestStore().currentRequest.id == requestStore().activeRequest.id;

        return !(this.drawerShowing && this.expanded) && !onDisabledRoute && !onActiveRequestDetails
    }

    get drawerShouldShow() {
        const onDisabledRoute = this.disabledDrawerRoutes.includes(navigationStore().currentRoute)
        return !onDisabledRoute
    }

    get drawerShowing() {
        return this.showing && this.drawerShouldShow 
    }

    get minimizedHandleShowing() {
        return this.drawerShowing && !this.expanded;
    }

    show = (view: BottomDrawerView, expanded?: boolean) => {
        const currentIsMinimizeable = this.minimizable;
        const newIsMinimizeable = this.isMinimizable(Config[view]);

        console.log('show - currentIsMinimizeable: ', currentIsMinimizeable)
        console.log('show - newIsMinimizeable: ', newIsMinimizeable)

        if (currentIsMinimizeable && newIsMinimizeable){
            if (this.viewId == view) {
                runInAction(() => {
                    this.showing = true
                    this.expanded = !!expanded
                    // this.headerShowing = true
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
                    // this.headerShowing = true
                })
            }
        } else if (currentIsMinimizeable) {
            runInAction(() => {
                this.viewIdStack.push(view);
                this.showing = true;
                this.expanded = !!expanded
                // this.headerShowing = true
            })
        } else if (!this.view) {
            runInAction(() => {
                this.viewId = view
                this.showing = true
                this.expanded = !!expanded
                // this.headerShowing = true
            })
        }

        console.log(this.viewId, this.showing, this.expanded)

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

    hide = async () => {
        await nativeEventStore().hideKeyboard()

        console.log(`hide - viewIdStack: ${this.viewIdStack}`)
        if (this.viewIdStack.length > 1) {
            runInAction(() => {
                const oldView = this.viewIdStack.pop();

                this._minimize(() => {
                    runInAction(() => {
                        console.log(`hide - oldView: ${oldView}`)
                        Config[oldView].onHide?.()
                    })
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
                console.log(`hide - viewId: ${this.viewId}`)
            })
        })

        runInAction(() => {
            this.showing = false
            this.expanded = false

            console.log('hide showing/expanded')
        })
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
        this._minimize(cb, true)
    }

    _minimize = (cb?: () => void, handleKeyboard?: boolean) => {
        if (handleKeyboard) {
            Keyboard.dismiss()
        }

        Animated.timing(this.bottomDrawerTabTop, {
            toValue: dimensions.height 
                - BottomDrawerHandleHeight 
                - (this.activeRequestShowing  ? ActiveRequestTabHeight : 0)
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
        return !!view.minimizable
    }
    
    clear() {

    }
}