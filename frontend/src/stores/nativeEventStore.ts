import { Store } from './meta';
import { INativeEventStore } from './interfaces';
import { Animated, Keyboard, KeyboardEvent } from 'react-native';
import { makeAutoObservable } from 'mobx';


@Store(INativeEventStore)
export default class NativeEventStore implements INativeEventStore {
    keyboardHeight = 0
    keyboardOpen = false;
    keyboardInTransition = false;

    constructor() {
        makeAutoObservable(this)

        // covering all the bases as willHide/Show is smoother but doesn't have as much
        // support on android
        Keyboard.addListener('keyboardDidShow', this.onKeyboardDidShow);
        Keyboard.addListener('keyboardDidHide', this.onKeyboardDidHide);
        Keyboard.addListener('keyboardWillShow', this.onKeyboardWillShow);
        Keyboard.addListener('keyboardWillHide', this.onKeyboardWillHide);
        Keyboard.addListener('keyboardDidChangeFrame', function (e: KeyboardEvent) {
            if (!this.keyboardInTransition) {
                if (this.keyboardOpen) {
                    this.keyboardHeight = 0;
                    this.keyboardOpen = false;
                } else {
                    this.keyboardHeight = e.endCoordinates.height;
                    this.keyboardOpen = true;
                }

                this.keyboardInTransition = true;
            }
        })
    }

    onKeyboardDidShow = (e: KeyboardEvent) => {
        const toHeight = e.endCoordinates.height;
        this.keyboardHeight = toHeight;
        this.keyboardOpen = true;
        this.keyboardInTransition = false;
    }

    onKeyboardDidHide = (e: KeyboardEvent) => {
        this.keyboardHeight = 0
        this.keyboardOpen = false
        this.keyboardInTransition = false;
    }

    onKeyboardWillShow = (e: KeyboardEvent) => {
        const toHeight = e.endCoordinates.height;
        this.keyboardHeight = toHeight;
        this.keyboardOpen = true;
        this.keyboardInTransition = true;
    }

    onKeyboardWillHide = (e: KeyboardEvent) => {
        console.log('Will hide')
        this.keyboardHeight = 0
        this.keyboardOpen = false
        this.keyboardInTransition = true;
    }
    
    clear() {
        this.keyboardHeight = 0
        this.keyboardOpen = false;
        this.keyboardInTransition = false
    }
}