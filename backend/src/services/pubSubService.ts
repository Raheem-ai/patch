import { Service } from "@tsed/common";
import { PubSubManager } from "../common/pubSubManager";

@Service()
export class PubSubService extends PubSubManager {
    async $onInit() {
        await this.init()
    }
}