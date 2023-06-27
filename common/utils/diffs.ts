import { exhaustiveStringTuple } from '..';
import { ArrayCollectionUpdate, CategorizedItem, HelpRequest, Position, PositionUpdate, PositionSetUpdate, RequestUpdates, ShiftOccurrence, ShiftOccurrenceSetUpdate, ShiftOccurrenceUpdate, Shift, ShiftUpdates, EditShiftUpdates, ReplaceableShiftOccurrenceProps, ShiftOccurrenceDiff, ShiftSeries, ShiftSeriesSetUpdate, ShiftSeriesUpdate, ReplaceableShiftSeriesProps } from '../models'

/**
 * Diff model: For a given type T, there is a type Diff<T> and the following functions: 
 * 
 * apply(toUpdate: T, diff: Diff<T>): void
 * merge(toUpdate: Diff<T>, moreUpdates: Diff<T>): void
 * project(base: T[], diff: Diff<T[]>): T[]
 * 
 * such that, 
 * 
 * 1) Diff<T> represents ALL the possible changes that can be made to T
 * 
 * 2) apply(...) updates the `toUpdate` object to have the changes
 * detailed in `diff`
 * 
 * 3) merge(...) resolves conflicts between two diffs and updates 
 * `toUpdate` with the latest from both changes
 * 
 * 4) if T extends Collection<T>, instead of an apply function, it will have a project(...) function that
 * returns a collection with both untouched objects from the original collection and objects that have 
 * had individual diffs applied. NOTE: this means if the objects from the base collection shouldn't be updated, 
 * the caller needs to pass in a deep copy of base 
 * 
 * ie. const cpy = JSON.parse(JSON.stringify(readOnlyCollection))
 * const projection = projectFooUpdates(cpy, collectionUpdates)
 */

export function projectArrayUpdates<A, R=A>(
    base: A[],
    diff: ArrayCollectionUpdate<A, R>,
    toId: (item: A | R) => string,
): A[] {
    const items = new Map(base.map(item => [toId(item), item]));

    diff.removedItems.forEach(toRemove => items.delete(toId(toRemove)))

    diff.addedItems.forEach(toAdd => items.set(toId(toAdd), toAdd))

    return Array.from(items.values())
}

export function mergeArrayCollectionUpdates<A, R=A>(
    toUpdate: ArrayCollectionUpdate<A, R>, 
    diff: ArrayCollectionUpdate<A, R>,
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
            // add + remove cancels out (though this shouldn't happen)
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

export function applyUpdateToPosition(toUpdate: Position, diff: PositionUpdate) {
    for (const prop in diff.replacedProperties) {
        toUpdate[prop] = diff.replacedProperties[prop]
    }

    toUpdate.attributes = projectArrayUpdates(toUpdate.attributes, diff.attributeUpdates, categorizedItemToString) 
}

export function projectPositionUpdates(toProject: Position[], updates: PositionSetUpdate) {
    // map existing positions
    const positionsProjection = toProject.map(basePos => {
        const removedIdx = updates.removedItems.findIndex(removed => removed.id == basePos.id)
        
        // if positions is in the deleted...return null
        if (removedIdx != -1) {
            return null
        }

        // if position has edits
        const editedIdx = updates.itemUpdates.findIndex(updated => updated.id == basePos.id)
        
        if (editedIdx != -1) {
            // return existing position with updates applied
            const update = updates.itemUpdates[editedIdx];
            applyUpdateToPosition(basePos, update)
            
            return basePos
        }

        return basePos
    })
    // filter out locally or remotely removed requests
    .filter(p => !!p);

    // add all new positions to the end        
    positionsProjection.push(...updates.addedItems)

    return positionsProjection as Position[]
}

export function mergePositionUpdates(toUpdate: PositionUpdate, diff: PositionUpdate) {
    for (const prop in diff.replacedProperties) {
        toUpdate.replacedProperties[prop] = diff.replacedProperties[prop]
    }

    mergeArrayCollectionUpdates(toUpdate.attributeUpdates, diff.attributeUpdates, (a, b) => a.categoryId == b.categoryId && a.itemId == b.itemId)
}

export function applyUpdateToRequest(toUpdate: Omit<HelpRequest, 'createdAt' | 'updatedAt'>, updates: RequestUpdates) {
    for (const prop in updates.replacedProperties) {
        // field specific work if we need it in the future
        toUpdate[prop] = updates.replacedProperties[prop]
    }

    toUpdate.positions = projectPositionUpdates(toUpdate.positions, updates.positionUpdates)

    toUpdate.tagHandles = projectArrayUpdates(toUpdate.tagHandles, updates.tagUpdates, categorizedItemToString)

    toUpdate.type = projectArrayUpdates(toUpdate.type, updates.typeUpdates, (typ) => typ as unknown as string)
}

export function mergePositionSetUpdates(toUpdate: PositionSetUpdate, diff: PositionSetUpdate, newPositionIds: Set<string>) {

    // add any removes from the most recent edit to the diff with the server
    diff.removedItems.forEach(removed => {
        const idx = toUpdate.removedItems.findIndex(pos => pos.id == removed.id)

        if (idx == -1) {
            // discard edits since the last sync with the server
            const editedIdx = toUpdate.itemUpdates.findIndex(pos => pos.id == removed.id)
            if (editedIdx != -1) {
                toUpdate.itemUpdates.splice(editedIdx, 1)
            }

            // discard new positions that have never been to the server
            if (newPositionIds.has(removed.id)) {
                const newIdx = toUpdate.addedItems.findIndex(pos => pos.id == removed.id)

                toUpdate.addedItems.splice(newIdx, 1)
                newPositionIds.delete(removed.id)
            } else {
                // add remove to the updates to sync with the server
                toUpdate.removedItems.push(removed)
            }
        }

    })

    // apply updates from the most recent edit to the diff with the server
    diff.itemUpdates.forEach(update => {

        // apply edits to position that exists locally but is new to the server
        const updatedIdx = toUpdate.itemUpdates.findIndex(upd => upd.id == update.id)
        if (updatedIdx != -1) {

            mergePositionUpdates(toUpdate.itemUpdates[updatedIdx], update)
            return;
        }

        // apply edits to position that exists locally but is new to the server
        const addedIdx = toUpdate.addedItems.findIndex(pos => pos.id == update.id)

        if (addedIdx != -1) {
            applyUpdateToPosition(toUpdate.addedItems[addedIdx], update)
            return;
        }

        // first time editing this one so add it to diff with the server
        toUpdate.itemUpdates.push(update)
    })

    // add and track new items for processing before we send to the server
    diff.addedItems.forEach(added => {
        // save temp local id to be stripped off later
        newPositionIds.add(added.id);

        toUpdate.addedItems.push(added)
    })
}

export function projectShiftOccurrenceUpdates(toProject: { [occurenceId: string]: ShiftOccurrenceDiff }, updates: ShiftOccurrenceSetUpdate): { [occurenceId: string]: ShiftOccurrenceDiff } {
    // map existing shift occurrences
    const shiftOccurrenceProjection: { [occurenceId: string]: ShiftOccurrenceDiff } = {};
    for (const id in toProject) {
        const removedIdx = updates.removedItems.findIndex(removed => removed.id == id);

        // if occurrence is in the deleted...skip adding it to the projection.
        if (removedIdx != -1) {
            continue;
        }

        // if the occurrence has edits
        const editedIdx = updates.itemUpdates.findIndex(updated => updated.id == id)
        if (editedIdx != -1) {
            // return existing occurrence with updates applied
            const update = updates.itemUpdates[editedIdx];
            applyUpdateToShiftOccurrenceDiff(toProject[id], update);
            shiftOccurrenceProjection[id] = toProject[id];
        }
    }

    // add all new occurrence diffs
    updates.addedItems.forEach(addedOccurrence => {
        // shiftOccurrenceProjection[addedOccurrence.id] = addedOccurrence;
    })

    return shiftOccurrenceProjection;
}

// TODO: Enforce that the input and returned series have at least one element?
export function projectShiftSeriesUpdates(toProject: ShiftSeries[], updates: ShiftSeriesSetUpdate): ShiftSeries[] {
    // TODO: This at the series level?
    /*
    for (const prop in updates.replacedProperties) {
        // field specific work if we need it in the future
        toUpdate[prop] = updates.replacedProperties[prop]
    }

    toUpdate.positions = projectPositionUpdates(toUpdate.positions, updates.positionUpdates)
    // TODO: do shifts need a computed occurrence map OR do the projections just need the diffs?
    toUpdate.occurrenceDiffs = projectShiftOccurrenceUpdates(toUpdate.occurrenceDiffs, updates.shiftOccurrenceUpdates);
    */
    return [];
}

export function applyUpdateToShiftOccurrenceDiff(toUpdate: ShiftOccurrenceDiff, diff: ShiftOccurrenceUpdate) {
    for (const prop in diff.replacedProperties) {
        toUpdate[prop] = diff.replacedProperties[prop]
    }

    toUpdate.positions = projectPositionUpdates(toUpdate.positions, diff.positionUpdates);
}

export function mergeShiftOccurrenceSetUpdates(toUpdate: ShiftOccurrenceSetUpdate, diff: ShiftOccurrenceSetUpdate, newOccurrenceIds: Set<string>, newPositionIdsByOccurrence: Map<string, Set<string>>) {
    // add any removes from the most recent edit to the diff with the server
    diff.removedItems.forEach(removed => {
        const idx = toUpdate.removedItems.findIndex(pos => pos.id == removed.id)

        if (idx == -1) {
            // discard edits since the last sync with the server
            const editedIdx = toUpdate.itemUpdates.findIndex(pos => pos.id == removed.id)
            if (editedIdx != -1) {
                toUpdate.itemUpdates.splice(editedIdx, 1)
            }

            // discard new occurrence diffs that have never been to the server
            if (newOccurrenceIds.has(removed.id)) {
                const newIdx = toUpdate.addedItems.findIndex(pos => pos.id == removed.id)

                toUpdate.addedItems.splice(newIdx, 1)
                newOccurrenceIds.delete(removed.id)

                newPositionIdsByOccurrence.delete(removed.id);
            } else {
                // add remove to the updates to sync with the server
                toUpdate.removedItems.push(removed)
            }
        }
    })

    // apply updates from the most recent edit to the diff with the server
    diff.itemUpdates.forEach(update => {
        // apply edits to occurrence that exists locally but is new to the server
        const updatedIdx = toUpdate.itemUpdates.findIndex(upd => upd.id == update.id)
        if (updatedIdx != -1) {
            mergeShiftOccurrenceUpdates(toUpdate.itemUpdates[updatedIdx], update, newPositionIdsByOccurrence.get(update.id))
            return;
        }

        const addedIdx = toUpdate.addedItems.findIndex(pos => pos.id == update.id)

        if (addedIdx != -1) {
            // applyUpdateToShiftOccurrence(toUpdate.addedItems[addedIdx], update)
            return;
        }

        // first time editing this one so add it to diff with the server
        toUpdate.itemUpdates.push(update)
    })

    // add and track new items for processing before we send to the server
    diff.addedItems.forEach(added => {
        // save temp local id to be stripped off later
        newOccurrenceIds.add(added.id);

        newPositionIdsByOccurrence.set(added.id, new Set());

        toUpdate.addedItems.push(added)
    })
}

export function mergeShiftOccurrenceUpdates(toUpdate: ShiftOccurrenceUpdate, diff: ShiftOccurrenceUpdate, newPositionIds: Set<string>) {
    for (const prop in diff.replacedProperties) {
        toUpdate.replacedProperties[prop] = diff.replacedProperties[prop]
    }

    mergePositionSetUpdates(toUpdate.positionUpdates, diff.positionUpdates, newPositionIds)
}

export function applyUpdateToShift(toUpdate: Omit<Shift, 'createdAt' | 'updatedAt'>, updates: ShiftUpdates) {
    /*
    toUpdate.series = projectShiftSeriesUpdates(toUpdate.series, updates.shiftSeriesUpdates);
    for (const prop in updates.replacedProperties) {
        // field specific work if we need it in the future
        toUpdate[prop] = updates.replacedProperties[prop]
    }

    toUpdate.positions = projectPositionUpdates(toUpdate.positions, updates.positionUpdates)
    // TODO: do shifts need a computed occurrence map OR do the projections just need the diffs?
    toUpdate.occurrenceDiffs = projectShiftOccurrenceUpdates(toUpdate.occurrenceDiffs, updates.shiftOccurrenceUpdates);
    */
}

export function mergeEditShiftUpdatesForBulkShifts(toUpdate: ShiftUpdates, diff: EditShiftUpdates, newPositionIds: Set<string>) {
    console.log('MERGE EDIT SHIFT UPDATES FOR ALL SHITS...');
    console.log(`UPDATES: ${JSON.stringify(diff)}`)

    const props = exhaustiveStringTuple<keyof ReplaceableShiftSeriesProps>()("title", "description", "recurrence");

    const seriesUpdate: ShiftSeriesUpdate = {
        replacedProperties: {},
        positionUpdates: {
            addedItems: [],
            removedItems: [],
            itemUpdates: []
        },
        shiftOccurrenceUpdates: {
            addedItems: [],
            removedItems: [],
            itemUpdates: []
        }
    }

    for (const prop of props) {
        seriesUpdate.replacedProperties[prop] = diff.shiftSeriesUpdates.replacedProperties[prop] as any;
    }

    mergePositionSetUpdates(seriesUpdate.positionUpdates, diff.shiftSeriesUpdates.positionUpdates, newPositionIds);
    toUpdate.shiftSeriesUpdates = seriesUpdate;
    console.log(`TO UPDATE: ${JSON.stringify(toUpdate)}`);
}

export function mergeEditShiftUpdatesForShiftOccurrence(occurrenceId: string, shiftSeries: ShiftSeries, toUpdate: ShiftUpdates, diff: EditShiftUpdates, newPositionIds: Set<string>) {
    console.log('MERGE EDIT SHIFT UPDATES FOR SHIFT OCCURRENCE...');
    console.log(`UPDATES: ${JSON.stringify(diff)}`);

    // An exhaustive list of props that exist (and can be replaced) on a Shift Occurrence.
    const props = exhaustiveStringTuple<keyof ReplaceableShiftOccurrenceProps>()("title", "description", "dateTimeRange")

    // The updates from the incoming EditShiftUpdates object are meant to be applied to a single shift occurrence.
    // Below, updates will be transferred from the EditShiftUpdates object to this occurrenceUpdates object.
    const occurrenceUpdates: ShiftOccurrenceUpdate = {
        id: occurrenceId,
        replacedProperties: {},
        positionUpdates: {
            addedItems: [],
            removedItems: [],
            itemUpdates: []
        },
    }

    // Go through each replaceable prop for a ShiftOccurrence.
    // Check if that prop is in the replaced properties on the incoming edit object.
    // If so, transfer the replacement value from the edit object to the occurrence updates object.
    for (const prop of props) {
        if (prop in diff.shiftSeriesUpdates.replacedProperties) {
            // Not ideal cast, but we check and enforce types above
            occurrenceUpdates.replacedProperties[prop] = diff.shiftSeriesUpdates.replacedProperties[prop] as any;
        }
    }

    // Send position updates off to be merged (special case, different than primitive replaceable props)
    mergePositionSetUpdates(occurrenceUpdates.positionUpdates, diff.shiftSeriesUpdates.positionUpdates, newPositionIds);

    // Now that we have all of the updates properly on the occurrence updates object,
    // we need to apply those updates on the occurrence's parent shift series.
    // This shiftSeriesUpdate object maintains the updates to that series.
    const shiftSeriesUpdate: ShiftSeriesUpdate = {
        replacedProperties: {},
        positionUpdates: {
            addedItems: [],
            removedItems: [],
            itemUpdates: []
        },
        shiftOccurrenceUpdates: {
            addedItems: [],
            removedItems: [],
            itemUpdates: []
        }
    }

    // If the occurrence that's being edited already exists in the occurrence diffs for the series,
    // we simply push the new updates to our item updates. Otherwise, we note that this occurrence
    // update is an added item.
    if (shiftSeries.occurrenceDiffs[occurrenceId]) {
        shiftSeriesUpdate.shiftOccurrenceUpdates.itemUpdates.push(occurrenceUpdates);
    } else {
        shiftSeriesUpdate.shiftOccurrenceUpdates.addedItems.push(occurrenceUpdates);
    }

    // Lastly, push the series updates to the top-level shift updates.
    toUpdate.shiftSeriesUpdates = shiftSeriesUpdate;
    console.log(`TO UPDATE: ${JSON.stringify(toUpdate)}`);
}
