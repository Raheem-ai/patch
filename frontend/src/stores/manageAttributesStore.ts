import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IManageAttributesStore, organizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { Attribute, CategorizedItemUpdates, Category, PatchPermissions } from '../../../common/models';
import { OrgContext } from '../../../common/api';
import EditCategorizedItemStore from './editCategorizedItemStore';

@Store(IManageAttributesStore)
export default class ManageAttributesStore implements IManageAttributesStore {
    editStore = new EditCategorizedItemStore(() => this.attributeCategories, (...args) => this.onSave(...args))

    editPermissions = [PatchPermissions.AttributeAdmin]

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

    get attributeCategories() {
        const map: Map<string, Category> = new Map();

        organizationStore().metadata.attributeCategories.forEach(category => {
            map.set(category.id, {
                name: category.name,
                items: category.attributes
            })
        })

        return map
    } 

    getAttribute(categoryId: string, attributeId: string): Attribute {
        const category = this.attributeCategories.get(categoryId);
        return category?.items.find(item => item.id == attributeId);
    }

    onSave = async (updates: CategorizedItemUpdates) => {
        const updatedOrg = await api().updateAttributes(this.orgContext(), updates);
        organizationStore().updateOrgData(updatedOrg);
    }

    clear() {
        this.editStore.clear()
    }
    
}