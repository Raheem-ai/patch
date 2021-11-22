import {  Store } from './meta';
import { BottomDrawerComponentClass, BottomDrawerConfig, BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore } from './interfaces';
import { Alert, Animated, Dimensions } from 'react-native';
import { persistent } from '../meta';
import { HeaderHeight, InteractiveHeaderHeight } from '../components/header/header';
import { makeAutoObservable, runInAction } from 'mobx';
import RequestChat from '../components/requestChat';
import EditHelpRequest from '../components/editRequest';
import AssignResponders from '../components/assignResponders';
import CreateHelpRequest from '../components/createRequest';

const Config: BottomDrawerConfig = {
    [BottomDrawerView.assignResponders]: AssignResponders,
    [BottomDrawerView.createRequest]: CreateHelpRequest,
    [BottomDrawerView.editRequest]: EditHelpRequest,
    [BottomDrawerView.requestChat]: RequestChat
}

const dimensions = Dimensions.get('window')

@Store(IBottomDrawerStore)
export default class BottomDrawerStore implements IBottomDrawerStore {
    topAnim = new Animated.Value(dimensions.height)
    expanded: boolean = false;
    showing: boolean = false;

    viewIdStack: BottomDrawerView[] = []

    constructor() {
        makeAutoObservable(this)
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
                    this.viewIdStack.push(view);
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

        Animated.timing(this.topAnim, {
            toValue: !!expanded 
                ? 0 + (newIsMinimizeable
                    ? HeaderHeight
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

        Animated.timing(this.topAnim, {
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

        Animated.timing(this.topAnim, {
            toValue: 0 + (isMinimizable
                ? HeaderHeight
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
        Animated.timing(this.topAnim, {
            toValue: dimensions.height - BottomDrawerHandleHeight,
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