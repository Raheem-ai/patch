import { IBaseStore, ICreateRequestStore, IDispatchStore, ILocationStore, INotificationStore, IRequestStore, IUserStore } from './interfaces';
import UserStore from './userStore';
import LocationStore from './locationStore';
import NotificationStore from './notificationStore';
import DispatchStore from './dispatchStore';
import { getStore } from './meta';
import CreateRequestStore from './createRequestStore';
import RequestStore from './requestStore';
import { container } from '../meta';

const storeMappings: [{ id: symbol }, new () => any][] = [
    [ IUserStore, UserStore ],
    [ ILocationStore, LocationStore ],
    [ INotificationStore, NotificationStore ],
    [ IDispatchStore, DispatchStore ],
    [ ICreateRequestStore, CreateRequestStore ],
    [ IRequestStore, RequestStore ]
];

export function bindStores() {
    for (const [ iStore, store] of storeMappings) {
        container.isBound(iStore.id) || container.bind(iStore.id).to(store).inSingletonScope();
    }
}

export async function initStores() {
    await Promise.all(storeMappings.map(([ iStore, _ ]) => {
        const store = getStore<IBaseStore>(iStore);
        return store.init();
    }));
}