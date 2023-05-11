import UserStore from './userStore';
import LocationStore from './locationStore';
import NotificationStore from './notificationStore';
import DispatchStore from './dispatchStore';
import { getStore } from './meta';
import CreateRequestStore from './createRequestStore';
import RequestStore from './requestStore';
import { container } from '../meta';
import SecretStore from './secretStore';
import EditRequestStore from './editRequestStore';
import BottomDrawerStore from './bottomDrawerStore';
import NativeEventStore from './nativeEventStore';
import HeaderStore from './headerStore';
import TeamStore from './teamStore';
import LinkingStore from './linkingStore';
import NewUserStore from './newUserStore';
import EditUserStore from './editUserStore';
import AlertStore from './alertStore';
import SocketStore from './socketStore';
import UpdateStore from './updateStore';
import OrganizationStore from './organizationStore';
import {
    AllStores,
    IBaseStore,
    IBottomDrawerStore,
    ICreateRequestStore,
    IDispatchStore,
    ILocationStore,
    INativeEventStore,
    INotificationStore,
    IRequestStore,
    IShiftStore,
    ISecretStore,
    IEditRequestStore,
    IUserStore,
    IHeaderStore,
    ITeamStore,
    ILinkingStore,
    INewUserStore,
    IEditUserStore,
    IAlertStore,
    ISocketStore,
    IUpdateStore,
    IOrganizationStore,
    IUpsertRoleStore,
    IManageAttributesStore,
    IManageTagsStore,
    INavigationStore,
    IOrganizationSettingsStore,
    IAppUpdateStore,
    IFormStore,
    IConnectionStore,
    IDynamicConfigStore,
    ICreateShiftStore
} from './interfaces';
import UpsertRoleStore from './upsertRoleStore';
import ManageAttributesStore from './manageAttributesStore';
import ManageTagsStore from './manageTagsStore';
import NavigationStore from './navigationStore';
import OrganizationSettingsStore from './organizationSettingStore';
import AppUpdateStore from './appUpdateStore';
import FormStore from './formStore';
import ConnectionStore from './connectionStore';
import DynamicConfigStore from './dynamicConfigStore';
import ShiftStore from './shiftStore';
import CreateShiftStore from './createShiftStore';

const storeMappings: [{ id: symbol }, new () => any][] = [
    [ IUserStore, UserStore ],
    [ ILocationStore, LocationStore ],
    [ INotificationStore, NotificationStore ],
    [ IDispatchStore, DispatchStore ],
    [ ICreateRequestStore, CreateRequestStore ],
    [ IRequestStore, RequestStore ],
    [ IShiftStore, ShiftStore ],
    [ ICreateShiftStore, CreateShiftStore ],
    [ ISecretStore, SecretStore ],
    [ IEditRequestStore, EditRequestStore ],
    [ IBottomDrawerStore, BottomDrawerStore ],
    [ INativeEventStore, NativeEventStore ],
    [ IHeaderStore, HeaderStore ],
    [ ITeamStore, TeamStore ],
    [ ILinkingStore, LinkingStore ],
    [ INewUserStore, NewUserStore ],
    [ IEditUserStore, EditUserStore ],
    [ IAlertStore, AlertStore ],
    [ ISocketStore, SocketStore ],
    [ IUpdateStore, UpdateStore ],
    [ IOrganizationStore, OrganizationStore ],
    [ IUpsertRoleStore, UpsertRoleStore ],
    [ IManageAttributesStore, ManageAttributesStore ],
    [ IManageTagsStore, ManageTagsStore ],
    [ INavigationStore, NavigationStore ],
    [ IOrganizationSettingsStore, OrganizationSettingsStore ],
    [ IAppUpdateStore, AppUpdateStore ],
    [ IFormStore, FormStore ],
    [ IConnectionStore, ConnectionStore ],
    [ IDynamicConfigStore, DynamicConfigStore ]
];

function validateStores() {
    const mappingSet = new Set<Symbol>(storeMappings.map(([val, _]) => val.id));
    const allStoreSet = new Set<Symbol>(AllStores.map((IStore) => IStore.id));

    const mappingDiff = new Set<Symbol>([...mappingSet].filter(s => !allStoreSet.has(s)));
    const allStoreDiff = new Set<Symbol>([...allStoreSet].filter(s => !mappingSet.has(s)));

    let errorMsg = '';

    if (mappingDiff.size) {
        errorMsg += `\nStore(s) "${Array.from(mappingDiff.values()).map(s => s.toString()).join(', ')}" are in the startup mapping but not in the AllStores array`
    }

    if (allStoreDiff.size) {
        errorMsg += `\nStore(s) "${Array.from(allStoreDiff.values()).map(s => s.toString()).join(', ')}" are in the AllStores array but not in the startup mapping`
    } 

    if (errorMsg) {
        throw errorMsg
    }
}

export function bindStores() {
    validateStores()

    for (const [ iStore, store ] of storeMappings) {
        container.isBound(iStore.id) || container.bind(iStore.id).to(store).inSingletonScope();
    }
}

export async function initStores() {
    await Promise.all(storeMappings.map(([ iStore, _ ]) => {
        const store = getStore<IBaseStore>(iStore);
        return store.init();
    }));
}
