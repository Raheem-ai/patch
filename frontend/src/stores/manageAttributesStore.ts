import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { alertStore, IManageAttributesStore, organizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { CategorizedItemUpdates, Category } from '../../../common/models';
import { OrgContext } from '../../../common/api';
import { resolveErrorMessage } from '../errors';
import * as uuid from 'uuid';

@Store(IManageAttributesStore)
export default class ManageAttributesStore implements IManageAttributesStore {

    private categoryNameChanges: { id: string, name: string }[] = [];
    private itemNameChanges: { categoryId: string, itemId: string, name: string }[] = [];

    private deletedCategories: string[] = [];
    private deletedItems: { [categoryId: string]: string[] } = {};

    private newCategories: { [id: string]: Category; } = {}
    private newItems: Map<string, {
        [itemId: string]: string
    }> = new Map()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()
        await organizationStore().init()
        await alertStore().init()
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    tempId = (ctx: string) => {
        return `temp-${ctx}-${uuid.v1()}`
    }

    get definedCategories() {
        const map: Map<string, Category> = new Map();

        organizationStore().metadata.attributeCategories.forEach(category => {
            map.set(category.id, {
                name: category.name,
                items: category.attributes
                // items: JSON.parse(JSON.stringify(category.attributes))
            })
        })

        return map
    } 

    // Projection of the defined set of categories/items + diff of changes
    get categories() {
        const entries = JSON.parse(JSON.stringify(Array.from(this.definedCategories.entries())))
        const map: Map<string, Category> = new Map(entries);

        // add new categories
        for (const newCategoryId in this.newCategories) {
            const newCategory = this.newCategories[newCategoryId];
            map.set(newCategoryId, newCategory);
        }

        // add new items 
        for (const [categoryId, itemMap] of this.newItems.entries()) {
            // const itemMap = this.newItems[categoryId];
            const categoryToUpdate = Object.assign({}, map.get(categoryId));
            categoryToUpdate.items = categoryToUpdate.items.slice()

            for (const itemId in itemMap) {
                const i = categoryToUpdate.items.findIndex((e) => e.id == itemId)
                
                if (i == -1) {
                    categoryToUpdate.items.push({
                        id: itemId,
                        name: itemMap[itemId]
                    })
                }
            }

            map.set(categoryId, categoryToUpdate)
        }

        // apply edits to category
        this.categoryNameChanges.forEach(updatedCat => {
            map.get(updatedCat.id).name = updatedCat.name
        })

        // apply edits to items
        this.itemNameChanges.forEach(updatedItem => {
            const i = map.get(updatedItem.categoryId).items.findIndex(i => i.id == updatedItem.itemId)

            if (i !== -1) {
                map.get(updatedItem.categoryId).items[i] = {
                    id: updatedItem.itemId,
                    name: updatedItem.name
                }
            }
        })

        // remove deleted categories
        this.deletedCategories.forEach(deletedCategoryId => {
            map.delete(deletedCategoryId)
        })

        // remove deleted items
        for (const categoryId in this.deletedItems) {
            if (map.has(categoryId)) {
                map.get(categoryId).items = map.get(categoryId).items.filter(item => {
                    return !this.deletedItems[categoryId].includes(item.id)
                })
            }
        }

        return map
    } 

    addCategory = (categoryName: string) => {
        this.newCategories = Object.assign({}, this.newCategories, {
            [this.tempId(categoryName)]: {
                name: categoryName,
                items: []
            }
        })
    }

    // TODO: test...how does this show up in UI?
    editCategory = (categoryId: string, categoryName: string) => {
        if (this.newCategories[categoryId]) {
            this.newCategories = Object.assign({}, this.newCategories, {
                [categoryId]: {
                    name: categoryName,
                    items: this.newCategories[categoryId].items
                }
            })
            return;
        }

        const i = this.categoryNameChanges.findIndex(updatedCat => updatedCat.id == categoryId)

        if (i !== -1) {
            this.categoryNameChanges[i].name = categoryName
        } else {
            this.categoryNameChanges.push({
                id: categoryId, 
                name: categoryName
            })
        }
    }

    removeCategory = (categoryId: string) => {
        if (!!this.newCategories[categoryId]) {
            const cpy = Object.assign({}, this.newCategories);
            delete cpy[categoryId];

            this.newCategories = cpy;
            return
        }

        if (!this.deletedCategories.includes(categoryId)) {
            this.deletedCategories.push(categoryId)
        }
    }

    addItemToCategory = (categoryId: string, itemName: string) => {
        // if the category is new keep the updates local to it
        if (!!this.newCategories[categoryId]) {
            const cpy = Object.assign({}, this.newCategories);

            cpy[categoryId].items.push({
                id: this.tempId(itemName),
                name: itemName
            })
            
            this.newCategories = cpy;
            return
        }
        
        let newItems = this.newItems.get(categoryId);

        if (newItems) {
            newItems[this.tempId(itemName)] = itemName
        } else {
            newItems = {
                [this.tempId(itemName)]: itemName
            }
        }

        this.newItems.set(categoryId, newItems)
    }

    editItem = (categoryId: string, itemId: string, itemName: string) => {
        if (this.newItems.get(categoryId)?.[itemId]) {
            const newItems = this.newItems.get(categoryId);
            newItems[itemId] = itemName;

            this.newItems.set(categoryId, newItems);
        } else {
            const index = this.itemNameChanges.findIndex(change => change.categoryId == categoryId && change.itemId == itemId)

            if (index == -1) {
                this.itemNameChanges.push({
                    categoryId, itemId, name: itemName
                })
            } else {
                this.itemNameChanges[index].name = itemName
            }
            
        }
    }

    removeItemFromCategory = (categoryId: string, itemId: string) => {
        const deletedItems = Object.assign({}, this.deletedItems);

        // don't mark transient new items be marked as a delete
        if (!!this.newItems.get(categoryId)?.[itemId]) {
            const cpy = Object.assign({}, this.newItems.get(categoryId));
            delete cpy[itemId];
            this.newItems.set(categoryId, cpy);
            return
        }

        if (!deletedItems[categoryId]?.includes(itemId)) {
            deletedItems[categoryId] ||= [];
            deletedItems[categoryId].push(itemId)

            this.deletedItems = deletedItems
        }
    }

    save = async () => {
        // use this.categories to send an update to the db...if another user edits the tags/attributes you are editing in real time, this 
        // should absorb most of those changes without having to do anything...direct conflicts might be an issue
        // TODO: test editing these in real time with someone else

        const newItems: CategorizedItemUpdates['newItems'] = {};

        for (const [categoryId, itemMap] of this.newItems.entries()) {
            const itemNames: string[] = [];
            
            for (const fakeId in itemMap) {
                itemNames.push(itemMap[fakeId])
            }

            newItems[categoryId] = itemNames
        }

        const updates: CategorizedItemUpdates = {
            categoryNameChanges: this.categoryNameChanges,
            itemNameChanges: this.itemNameChanges,

            deletedCategories: this.deletedCategories,
            deletedItems: this.deletedItems,

            newCategories: this.newCategories,
            newItems
        }

        console.log(updates)
        
        const updatedOrg = await api().updateAttributes(this.orgContext(), updates);
        organizationStore().updateOrgData(updatedOrg);
        
        this.clear()
    }

    clear() {
        this.categoryNameChanges = [];
        this.itemNameChanges = [];

        this.deletedCategories = [];
        this.deletedItems = {};

        this.newCategories = {}
        this.newItems.clear()
    }

    
}