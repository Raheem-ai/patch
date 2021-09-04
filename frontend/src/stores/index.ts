import { IBaseStore, IDispatchStore, ILocationStore, INotificationStore, IUserStore } from './interfaces';
import UserStore from './userStore';
import LocationStore from './locationStore';
import NotificationStore from './notificationStore';
import DispatchStore from './dispatchStore';
import container, { getStore } from './meta';

const storeMappings: [{ id: symbol }, new () => any][] = [
    [ IUserStore, UserStore ],
    [ ILocationStore, LocationStore ],
    [ INotificationStore, NotificationStore ],
    [ IDispatchStore, DispatchStore ]
];

export function bindStores() {
    for (const [ iStore, store] of storeMappings) {
        container.bind(iStore.id).to(store);
    }
}

export async function initStores() {
    await Promise.all(storeMappings.map(([ iStore, _ ]) => {
        const store = getStore<IBaseStore>(iStore);
        return store.init();
    }));
}

bindStores();