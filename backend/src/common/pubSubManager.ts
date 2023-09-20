import { PubSub, Topic, Subscription, ClientConfig } from '@google-cloud/pubsub';
import assert from 'assert';
import { PatchEventPacket, PatchEventParams, PatchEventType } from "common/models";

enum PatchEventTopics {
    System = 'sys'
}

enum PatchEventSubscriptions {
    UIUpdateEvents = 'uiue'
}

type PatchPubSubConfig = {
    [sub in PatchEventSubscriptions]: PatchEventTopics
}

const PubSubConfig: PatchPubSubConfig = {
    [PatchEventSubscriptions.UIUpdateEvents]: PatchEventTopics.System
}

export class PubSubManager {

    static async create() {
        const manager = new PubSubManager()
        await manager.init();

        return manager
    }

    client = new PubSub();

    topics: Map<PatchEventTopics, Topic> = new Map()

    subscriptions: Map<PatchEventSubscriptions, Subscription> = new Map()

    async init() {

        const allTopics = await this.client.getTopics();
        const allSubs = await this.client.getSubscriptions();

        const targetSubs = new Set<PatchEventSubscriptions>();
        const targetTopics = new Set<PatchEventTopics>();

        for (const sub in PubSubConfig) {
            targetSubs.add(sub as PatchEventSubscriptions);
            targetTopics.add(PubSubConfig[sub as PatchEventSubscriptions])
        }

        await Promise.all(Array.from(targetTopics).map(async (t) => {
            const existingTopic = allTopics[0].find(top => top.name.split('/').pop() == t)

            if (existingTopic) {
                this.topics.set(t, existingTopic)
            } else {
                const res = await this.client.createTopic(t)
                this.topics.set(t, res[0])
            }
        }))

        await Promise.all(Array.from(targetSubs).map(async (s) => {
            const existingSubscription = allSubs[0].find(sub => sub.name.split('/').pop() == s)

            if (existingSubscription) {
                this.subscriptions.set(s, existingSubscription)
            } else {
                const topic = this.topics.get(PubSubConfig[s]);
                const res = await this.client.createSubscription(topic, s)

                this.subscriptions.set(s, res[0])
            }
        }))
    }

    get sysPub() {
        return this.topics.get(PatchEventTopics.System);
    }
    
    get uiUpdateSub() {
        return this.subscriptions.get(PatchEventSubscriptions.UIUpdateEvents);
    }

    async sys<E extends PatchEventType>(event: E, params: PatchEventParams[E]) {
        const packet: PatchEventPacket<E> = {
            event,
            params
        };

        const [messageId] = await this.sysPub.publishMessage({ json: packet })

        return messageId
    }
    
}