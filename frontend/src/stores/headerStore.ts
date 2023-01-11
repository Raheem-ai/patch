import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { IHeaderStore, connectionStore } from './interfaces';
import { Animated } from 'react-native';
import { HeaderAnnouncementHeight } from '../constants';

@Store(IHeaderStore)
export default class HeaderStore implements IHeaderStore {

    isOpen = false;

    announcementHeight = new Animated.Value(0)

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await connectionStore().init()

        if (connectionStore().isConnected) {
            this.hideConnectionAnnouncement()
        } else {
            this.showConnectionAnnouncement()
        }

    }

    showConnectionAnnouncement = () => {
        when(() => connectionStore().isConnected, this.hideConnectionAnnouncement)
    
        Animated.timing(this.announcementHeight, {
            toValue: HeaderAnnouncementHeight,
            duration: 300,
            useNativeDriver: false
        }).start()
    }

    hideConnectionAnnouncement = () => {
        when(() => !connectionStore().isConnected, this.showConnectionAnnouncement)

        Animated.timing(this.announcementHeight, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false
        }).start()
    }

    open() {
        this.isOpen = true
    }

    close() {
        this.isOpen = false;
    }

    clear() {
        
    }
   
}