import { makeAutoObservable } from "mobx";
import { CategorizedItemUpdates, Category } from "../../../common/models";
import { IEditCategorizedItemStore } from "./interfaces";
import * as uuid from 'uuid';

export default class EditCategorizedItemStore implements IEditCategorizedItemStore {
    
    // changes to existing categories
    private categoryNameChanges: { id: string, name: string }[] = [];
    // changes to existing items in an existing category
    private itemNameChanges: { categoryId: string, itemId: string, name: string }[] = [];

    // existing categories to delete
    private deletedCategories: string[] = [];
    // existing items in existing categories that should be deleted
    private deletedItems: { [categoryId: string]: string[] } = {};

    // new categories + items that don't exist yet
    private newCategories: { [id: string]: Category; } = {}
    // new items that don't exist yet but are created in an existing category
    private newItems: Map<string, {
        [itemId: string]: string
    }> = new Map()

    // categoryId -> pending item name
    pendingItems: Map<string, string> = new Map();
    
    constructor(
        private baseCategories: () => Map<string, Category>,
        private onSave: (updates: CategorizedItemUpdates) => Promise<void>
    ) {
        makeAutoObservable(this)
    }

    tempId = (ctx: string) => {
        return `temp-${ctx}-${uuid.v1()}`
    }

    get isDirty() {
        return !!this.categoryNameChanges.length
            || !!this.itemNameChanges.length
            || !!this.deletedCategories.length
            || !!Object.keys(this.deletedItems).map(items => items.length).reduce((sum, curr) => sum + curr, 0)
            || !!Object.keys(this.newCategories).length
            || !!Array.from(this.newItems.values()).map(items => Object.keys(items).length).reduce((sum, curr) => sum + curr, 0)
            || !!this.pendingItems.size
    }

    get isValid() {
        return this.isDirty 
            && this.categoryNameChanges.every(change => !!change.name) 
            && this.itemNameChanges.every(change => !!change.name)
    }

    get definedCategories() {
        return this.baseCategories()
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
                const cpy = JSON.parse(JSON.stringify(map.get(categoryId)));
                cpy.items = cpy.items.filter(item => {
                    return !this.deletedItems[categoryId].includes(item.id)
                })
                map.set(categoryId, cpy)
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
        if (!!this.newCategories[categoryId]) {
            // edit new category items within the new category itself
            const cpy = Object.assign({}, this.newCategories);
            const idx = this.newCategories[categoryId].items.findIndex(i => i.id == itemId);
            
            cpy[categoryId].items[idx].name = itemName;

            this.newCategories = cpy;
            return
        }

        // don't mark changes to new items as edits
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

        if (!!this.newCategories[categoryId]) {
            const cpy = Object.assign({}, this.newCategories);
            const idx = this.newCategories[categoryId].items.findIndex(i => i.id == itemId);
            
            cpy[categoryId].items.splice(idx, 1);

            this.newCategories = cpy;
            return;
        }

        // don't mark transient new items be marked as a delete
        if (!!this.newItems.get(categoryId)?.[itemId]) {
            const cpy = Object.assign({}, this.newItems.get(categoryId));
            delete cpy[itemId];
            this.newItems.set(categoryId, cpy);
            return
        }

        const deletedItems = Object.assign({}, this.deletedItems);

        if (!deletedItems[categoryId]?.includes(itemId)) {
            deletedItems[categoryId] = deletedItems[categoryId] || [];
            deletedItems[categoryId].push(itemId)

            this.deletedItems = deletedItems
        }
    }

    updatePendingItem = (categoryId: string, itemId: string) => {
        this.pendingItems.set(categoryId, itemId)
    }

    save = async () => {
        // use this.categories to send an update to the db...if another user edits the tags/attributes you are editing in real time, this 
        // should absorb most of those changes without having to do anything...direct conflicts might be an issue
        // TODO: test editing these in real time with someone else
        
        // add/reset all the pending items before saving
        Array.from(this.pendingItems.entries()).forEach(([categoryId, itemId]) => {
            if (itemId) {
                this.addItemToCategory(categoryId, itemId)
                this.updatePendingItem(categoryId, '')
            }
        })

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

        await this.onSave(updates)
        
        this.clear()
    }

    clear() {
        this.categoryNameChanges = [];
        this.itemNameChanges = [];

        this.deletedCategories = [];
        this.deletedItems = {};

        this.newCategories = {}
        this.newItems.clear()
        this.pendingItems.clear()
    }
}