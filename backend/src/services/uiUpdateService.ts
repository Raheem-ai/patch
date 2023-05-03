import { Inject, Service } from "@tsed/common";
import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { MySocketService } from "./socketService";
import { PatchEventPacket, PatchEventParams, PatchEventType } from "common/models";
import { PubSubService } from "./pubSubService";

@Service()
export class UIUpdateService {

    @Inject(MySocketService) socketService: MySocketService;
    @Inject(PubSubService) pubSubService: PubSubService;

    // runs after $onInit() so pubsub service dependency can initialize properly before we try to use it
    async $onAfterInit() {
        this.pubSubService.uiUpdateSub.on('message', async (msg: Message) => {
            msg.ack()
        
            console.log('Got PubSub Event:')

            const parsedMsg: PatchEventPacket = JSON.parse(msg.data.toString());

            if (!parsedMsg) {
                return
            }

            const { event, params } = parsedMsg;

            console.log('PubSub Event: ', event)
            console.log('PubSub Params: ', params)

            await this.socketService.handleUIUpdateFromSystemEvent(event, params)
        })
    }
}