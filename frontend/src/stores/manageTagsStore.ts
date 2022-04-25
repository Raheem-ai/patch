import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { Category, IManageTagsStore, organizationStore } from './interfaces';

// TODO: this and ManageAttributeStore both use the same code...should be a way to reuse...
@Store(IManageTagsStore)
export default class ManageTagsStore implements IManageTagsStore {
 
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

    get definedAttributes() {
        const map: Map<string, Category> = new Map();

        organizationStore().metadata.tagCategories.forEach(category => {
            map.set(category.id, {
                name: category.name,
                items: category.tags
            })
        })

        return map
    } 

    // Projection of the defined set of categories/items + diff of changes
    get categories() {
        const map = new Map(this.definedAttributes.entries());

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
            [`__temp-${categoryName}`]: {
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
        if (!this.deletedCategories.includes(categoryId)) {
            this.deletedCategories.push(categoryId)
        }
    }

    addItemToCategory = (categoryId: string, itemName: string) => {
        let newItems = this.newItems.get(categoryId);

        if (newItems) {
            newItems[`__temp-${itemName}`] = itemName
        } else {
            newItems = {
                [`__temp-${itemName}`]: itemName
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
            this.itemNameChanges.push({
                categoryId, itemId, name: itemName
            })
        }
    }

    removeItemFromCategory = (categoryId: string, itemId: string) => {
        const deletedItems = Object.assign({}, this.deletedItems);

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
    }

    clear() {
        
    }

  
}