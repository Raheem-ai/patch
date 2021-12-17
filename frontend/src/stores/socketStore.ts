import { makeAutoObservable, runInAction, when } from 'mobx';
import { getStore, Store } from './meta';
import { ISocketStore, IUserStore } from './interfaces';
import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from "socket.io-client";
import { apiHost } from '../api';
import { getService } from '../services/meta';
import { IAPIService } from '../services/interfaces';

@Store(ISocketStore)
export default class SocketStore implements ISocketStore {
    // defaultToastTime = 1000 * 4;

    private socket: Socket;

    private userStore = getStore<IUserStore>(IUserStore)
    private api = getService<IAPIService>(IAPIService)
    
    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await this.userStore.init()

        if (this.userStore.signedIn) {
            await this.connectAfterSignIn()
        } else {
            when(() => this.userStore.signedIn, this.connectAfterSignIn)
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
                token: this.api.refreshToken
            }
        })

        this.socket.on('connect', (...args) => {
            console.log('connect', args)
        })

        this.socket.on('disconnect', (...args) => {
            console.log('disconnect', args)
        })

        this.socket.on('message', (args, cb?) => {
            cb?.()
            console.log('message', args)
        })

        // reconnection tings
        this.socket.io.on('reconnect', (...args) => {
            console.log('reconnect', args)
        })
        
        this.socket.io.on('reconnect_attempt', (attempt) => {
            console.log('reconnect_attempt', attempt)

            if (attempt > 3) {
                this.socket.close()
            }
        })
        
        this.socket.io.on('reconnect_error', (args) => {
            console.log('reconnect_error', args.message)
        })
        
        this.socket.io.on('reconnect_failed', (...args) => {
            console.log('reconnect_failed', args)
        })

        this.socket.on('HELLO', () => {

        })

        when(() => !this.userStore.signedIn, () => {
            this.disconnect()

            when(() => this.userStore.signedIn, this.connectAfterSignIn)
        })
    }

    disconnect = () => {
        this.socket.disconnect();
    }

    ensureConnected() {
        if (this.userStore.signedIn && !this.socket.connected) {
            this.socket.connect()
        }
    }

    clear() {
        
    }
   
}