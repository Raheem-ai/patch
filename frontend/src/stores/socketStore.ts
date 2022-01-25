import { makeAutoObservable, when } from 'mobx';
import { Store } from './meta';
import { ISocketStore, requestStore, updateStore, userStore } from './interfaces';
import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from "socket.io-client";
import { apiHost } from '../api';
import { api } from '../services/interfaces';
import { PatchEventType, PatchUIEvent, PatchUIEventPacket, PatchUIEventParams } from '../../../common/models';

@Store(ISocketStore)
export default class SocketStore implements ISocketStore {
    // defaultToastTime = 1000 * 4;

    private socket: Socket;
    
    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()

        if (userStore().signedIn) {
            await this.connectAfterSignIn()
        } else {
            when(() => userStore().signedIn, this.connectAfterSignIn)
        }

        AppState.addEventListener('change', async (state: AppStateStatus) => {
            console.log('AppState', state)
        
            if (state == 'active') {
                // refresh data that could have changed in the background
                // ie. team, requests
                this.ensureConnected()
        
                // reconnect io socket if it is disconnected
            } else if (state == 'background') {
        
            }
        })
    }

    connectAfterSignIn = () => {
        this.socket = io(apiHost, {
            path: '/socket.io/',
            auth: {
                token: api().refreshToken
            }
        })

        this.socket.on('connect', (...args) => {
            console.log('connect', args)
        })

        this.socket.on('disconnect', (...args) => {
            console.log('disconnect', args)
        })

        this.socket.on('message', async (args, cb?) => {
            cb?.()
            await updateStore().onUIEvent(args);
        })

        // reconnection tings
        this.socket.io.on('reconnect', (...args) => {
            console.log('reconnect', args)
        })
        
        this.socket.io.on('reconnect_error', (args) => {
            console.log('reconnect_error', args.message)
        })
        
        this.socket.io.on('reconnect_failed', (...args) => {
            console.log('reconnect_failed', args)
        })

        when(() => !userStore().signedIn, () => {
            this.disconnect()

            when(() => userStore().signedIn, this.connectAfterSignIn)
        })
    }

    disconnect = () => {
        this.socket.disconnect();
    }

    ensureConnected() {
        if (userStore().signedIn && !this.socket.connected) {
            this.socket.connect()
        }
    }

    clear() {
        
    }
   
}