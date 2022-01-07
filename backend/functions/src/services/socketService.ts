import { Inject } from "@tsed/common";
import {Input, IO, Nsp, Socket, SocketErr, SocketService, SocketSession} from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { verifyRefreshToken } from "../auth";
import { UserDoc } from "../models/user";
import { DBManager } from "./dbManager";

type RaheemSocket = SocketIO.Socket<any, any, any, { refreshToken: string }>;

@SocketService()
export class MySocketService {

    @Inject(DBManager) db: DBManager;

    @Nsp nsp: SocketIO.Namespace;
    
    // public clients: Map<string, RaheemSocket> = new Map();

    constructor(
        @IO private io: SocketIO.Server
    ) { }

    $onNamespaceInit(nsp: SocketIO.Namespace) {
        console.log(`namespace ${nsp.name} initted`)
    }

    async $onConnection(@Socket socket: RaheemSocket, @SocketSession session: SocketSession) {
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

            // make sure old socket linked to user is removed from room
            this.io.in(user.id).socketsLeave(user.id);

            // add refresh token metadata and put socket in room <userId> 
            // so we can look it up from any websocket server in the cluster
            socket.data.refreshToken = refreshToken;
            socket.join(user.id);

            // set the time this should expire in the context 
            // & check the time when pushing to any socket...force disconnect if the time has past

            console.log(`User: '${user.id}' connected on socket: ${socket.id}`)

        }
    }

    $onDisconnect(@Socket socket: SocketIO.Socket) {
        console.log(`Socket disconnected ${socket.id}`)
    }

    async send(socket: SocketIO.Socket, params: any): Promise<boolean> {
        if (!socket.connected) {
            return false;
        }
        
        // check time to make sure not expired
        const expired = await verifyRefreshToken(socket.data?.refreshToken, this.db);

        if (expired) {
            // should send force logout here?
            socket.disconnect(true);
            return false;
        }

        socket.send(params);

        return true;
    }
}