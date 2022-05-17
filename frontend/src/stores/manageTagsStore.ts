import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IManageTagsStore, organizationStore, userStore } from './interfaces';
import { CategorizedItemUpdates, Category, PatchPermissions } from '../../../common/models';
import EditCategorizedItemStore from './editCategorizedItemStore';
import { api } from '../services/interfaces';
import { OrgContext } from '../../../common/api';

@Store(IManageTagsStore)
export default class ManageTagsStore implements IManageTagsStore {
    editStore = new EditCategorizedItemStore(() => this.tagCategoryMap, (...args) => this.onSave(...args))

    editPermissions = [PatchPermissions.TagAdmin]

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()
        await organizationStore().init()
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    get tagCategoryMap() {
        const map: Map<string, Category> = new Map();

        organizationStore().metadata.tagCategories.forEach(category => {
            map.set(category.id, {
                name: category.name,
                items: category.tags
            })
        })

        return map
    } 

    onSave = async (updates: CategorizedItemUpdates) => {
        const updatedOrg = await api().updateTags(this.orgContext(), updates);
        organizationStore().updateOrgData(updatedOrg);
    }

    clear() {
        this.editStore.clear()
    }
}