import { ArrayUpdates, CategorizedItem, Position, PositionUpdate } from '../models'

// TODO: these are doing similar things v differently...is one pattern better?
export function applyArrayUpdates<A, R=A>(
    base: A[],
    diff: ArrayUpdates<A, R>,
    toId: (item: A | R) => string,
): A[] {
    const items = new Map(base.map(item => [toId(item), item]));

    diff.removedItems.forEach(toRemove => items.delete(toId(toRemove)))

    diff.addedItems.forEach(toAdd => items.set(toId(toAdd), toAdd))

    return Array.from(items.values())
}

export function mergeArrayUpdates<A, R=A>(
    toUpdate: ArrayUpdates<A, R>, 
    diff: ArrayUpdates<A, R>,
    checkEquality: (a: A | R, b: A | R) => boolean
) {
    diff.removedItems.forEach(removedItem => {
        const addedIdx = toUpdate.addedItems.findIndex(item => checkEquality(item, removedItem))

        if (addedIdx != -1) {
            // add + remove cancels out
            toUpdate.addedItems.splice(addedIdx, 1)
            return;
        }

        const removedIdx = toUpdate.removedItems.findIndex(item => checkEquality(item, removedItem))
        
        if (removedIdx == -1) {
            // add it
            toUpdate.removedItems.push(removedItem)
        }
    })

    diff.addedItems.forEach(addedItem => {
        const removedIdx = toUpdate.removedItems.findIndex(item => checkEquality(item, addedItem))

        if (removedIdx != -1) {
            // add + remove cancels out
            toUpdate.removedItems.splice(removedIdx, 1)
            return;
        }

        const addedIdx = toUpdate.addedItems.findIndex(item => checkEquality(item, addedItem))
        
        if (addedIdx == -1) {
            // add it
            toUpdate.addedItems.push(addedItem)
        }
    })
}

export function categorizedItemToString(handle: CategorizedItem) {
    return `${handle.categoryId}${handle.itemId}`
}

// TODO: should these be pure vs updating in place?
export function applyPositionUpdate(toUpdate: Position, diff: PositionUpdate) {
    for (const prop in diff.replacedProperties) {
        toUpdate[prop] = diff.replacedProperties[prop]
    }

    toUpdate.attributes = applyArrayUpdates(toUpdate.attributes, diff.attributeUpdates, categorizedItemToString) 
}

export function mergePositionUpdates(toUpdate: PositionUpdate, diff: PositionUpdate) {
    for (const prop in diff.replacedProperties) {
        toUpdate.replacedProperties[prop] = diff.replacedProperties[prop]
    }

    mergeArrayUpdates(toUpdate.attributeUpdates, diff.attributeUpdates, (a, b) => a.categoryId == b.categoryId && a.itemId == b.itemId)
}