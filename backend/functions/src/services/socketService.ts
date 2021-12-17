import { Inject } from "@tsed/common";
import {Input, IO, Nsp, Socket, SocketService, SocketSession} from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { verifyRefreshToken } from "../auth";
import { UserDoc } from "../models/user";
import { DBManager } from "./dbManager";

@SocketService()
export class MySocketService {

    @Inject(DBManager) db: DBManager;

    @Nsp nsp: SocketIO.Namespace;

    constructor(@IO private io: SocketIO.Server) { }

    $onNamespaceInit(nsp: SocketIO.Namespace) {
        console.log(`namespace ${nsp.name} initted`)
    }

    async $onConnection(@Socket socket: SocketIO.Socket, @SocketSession session: SocketSession) {
        const refreshToken = socket.handshake?.auth?.token;
        
        if (!refreshToken) {
            socket.disconnect(true);
            return
        } else {
            // verify token and get userId from it
            let user: UserDoc;

            try {
                user = await verifyRefreshToken(refreshToken, this.db);
            } catch (e) {
                socket.disconnect(true)
                return
            }

            // put socket in room userId so we can refer to it later

            // set the time this should expire in the context 
            // & check the time when pushing to any socket...force disconnect if the time has past

            console.log(`User: '${user.id}' connected on socket: ${socket.id}`)

        }
    }

    $onDisconnect(@Socket socket: SocketIO.Socket) {
        console.log(`Socket disconnected ${socket.id}`)
    }

    send(socket: SocketIO.Socket, params: any) {
        if (!socket.connected) {
            return;
        }
        
        // check time to make sure not expired
        const expired = false;

        if (expired) {
            socket.disconnect(true);
            return;
        }

        socket.send(params);
    }

    @Input('hello')
    hello() {

    }
}