import { validateMappings } from '../utils';
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
    IConnectionStore
} from './interfaces';
import UpsertRoleStore from './upsertRoleStore';
import ManageAttributesStore from './manageAttributesStore';
import ManageTagsStore from './manageTagsStore';
import NavigationStore from './navigationStore';
import OrganizationSettingsStore from './organizationSettingStore';
import AppUpdateStore from './appUpdateStore';
import FormStore from './formStore';
import ConnectionStore from './connectionStore';

const storeMappings: [{ id: symbol }, new () => any][] = [
    [ IUserStore, UserStore ],
    [ ILocationStore, LocationStore ],
    [ INotificationStore, NotificationStore ],
    [ IDispatchStore, DispatchStore ],
    [ ICreateRequestStore, CreateRequestStore ],
    [ IRequestStore, RequestStore ],
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
    [ IConnectionStore, ConnectionStore ]
];

export function bindStores() {
    validateMappings(storeMappings, AllStores, 'Store')

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
