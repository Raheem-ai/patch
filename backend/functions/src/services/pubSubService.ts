import { Inject, Service } from "@tsed/common";
import { PubSub } from '@google-cloud/pubsub';

@Service()
export class PubSubService {

    client = new PubSub();

    constructor(
    ) {
        this.client.getTopics().then(console.log).catch(console.error)
    }

    
}