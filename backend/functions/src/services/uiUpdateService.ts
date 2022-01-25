import { Inject, Service } from "@tsed/common";
import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { MySocketService } from "./socketService";
import { PatchEventPacket, PatchEventParams, PatchEventType } from "common/models";
import { PubSubService } from "./pubSubService";

@Service()
export class UIUpdateService {

    @Inject(MySocketService) socketService: MySocketService;
    @Inject(PubSubService) pubSubService: PubSubService;

    async $onInit() {
        this.pubSubService.uiUpdateSub.on('message', async (msg: Message) => {
            msg.ack()

            const parsedMsg: PatchEventPacket = JSON.parse(msg.data.toString());

            if (!parsedMsg) {
                return
            }

            const { event, params } = parsedMsg;

            console.log('Got PubSub Event: ', event, params)

            await this.socketService.handleUIUpdateFromSystemEvent(event, params)
        })
    }
}