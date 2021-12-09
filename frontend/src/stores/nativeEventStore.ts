import { Store } from './meta';
import { INativeEventStore } from './interfaces';
import { Keyboard, KeyboardEvent } from 'react-native';
import { makeAutoObservable } from 'mobx';


@Store(INativeEventStore)
export default class NativeEventStore implements INativeEventStore {
    keyboardHeight = 0;

    constructor() {
        makeAutoObservable(this)

        Keyboard.addListener('keyboardDidShow', this.onKeyboardDidShow);
        Keyboard.addListener('keyboardDidHide', this.onKeyboardDidHide);
        Keyboard.addListener('keyboardDidChangeFrame', function (e: KeyboardEvent) {
            console.log('frame', e.endCoordinates.height)
        })
    }

    onKeyboardDidShow = (e: KeyboardEvent) => {
        console.log('did show', e.endCoordinates.height)
        this.keyboardHeight = e.endCoordinates.height;
    }

    onKeyboardDidHide = () => {
        this.keyboardHeight = 0;
    }

    get keyboardOpen() {
        return this.keyboardHeight > 0
    }
    
    clear() {

    }
}