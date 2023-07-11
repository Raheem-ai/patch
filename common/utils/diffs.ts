import { exhaustiveStringTuple } from '..';
import { getShiftOccurrenceIdFromParts, getPartsFromShiftOccurrenceId, getShiftOccurrenceDateStrFromId, getShiftSeriesFromOccurrenceDateTime, getShiftSeriesFromShiftOccurrenceId} from './shiftUtils'
import { ArrayCollectionUpdate, CategorizedItem, HelpRequest, Position, PositionUpdate, PositionSetUpdate, RequestUpdates, ShiftOccurrence, ShiftOccurrenceSetUpdate, ShiftOccurrenceUpdate, Shift, ShiftUpdates, EditShiftUpdates, ReplaceableShiftOccurrenceProps, ShiftOccurrenceDiff, ShiftSeries, ShiftSeriesUpdate, ReplaceableShiftSeriesProps } from '../models'

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

// Given a shift to update, a set of shift updates, and potentially a shift occurrence Id and uuid in case the shift becomes detached,
// determine if the updates are for an occurrence, bulk editing all series, or bulk editing a subset of series for the provided shift.
// Then apply the updates to the proper level of the shift and its series.
// NOTE: In the case of a shift occurrence being edited in a way that detaches it from the recurrence rules of the series that contains it,
// we need a unique id to generate its full detached shift occurrence id. Because the common modules cannot import libraries, for now, the
// caller is forced to optionally supply this value.
export function applyUpdateToShift(toUpdate: Omit<Shift, 'createdAt' | 'updatedAt'>, updates: ShiftUpdates, shiftOccurrenceId?: string, uuid?: string) {
    // If the condition passes, we're editing a single shift occurrence,
    // otherwise we're editing shift series.
    if (shiftOccurrenceId && hasOccurrenceUpdates(updates)) {
        // Edit a specific shift occurrence
        // Get the current diff for this shift occurrence
        const [seriesToUpdate, occurrenceDiffToUpdate] = getShiftSeriesAndOccurrenceDiff(toUpdate, shiftOccurrenceId);

        // Apply the new updates to that shift occurrence
        applyUpdateToShiftOccurrenceDiff(occurrenceDiffToUpdate, updates.shiftSeriesUpdates.shiftOccurrenceUpdate, uuid);

        // TODO: Update the start date of its previous series to the earliest date
        // based on its current diffs?

        // If the shift id has changed, that means that the shift has been edited in a way such
        // that it's detached from a series. In this case we need to confirm which series it
        // should be associated with and place it in the detached diffs collection for that series.
        if (occurrenceDiffToUpdate.id != shiftOccurrenceId) {
            const newOccurrenceId = occurrenceDiffToUpdate.id;
            const newOccurrenceIdParts = getPartsFromShiftOccurrenceId(newOccurrenceId);
            const oldOccurrenceIdParts = getPartsFromShiftOccurrenceId(shiftOccurrenceId);

            // If the shift occurrence was not previously detached, we must now detach it and delete its
            // corresponding projected occurrence. If the shift occurrence was previously detached, then
            // the deletion of the projected occurrence has already been handled.
            if (!oldOccurrenceIdParts.detachedId) {
                seriesToUpdate.deletedOccurrenceIds.push(shiftOccurrenceId);

                // If there was a projected diff for this occurrence, we can remove
                // it from the collection now.
                if (seriesToUpdate.projectedDiffs?.[shiftOccurrenceId]) {
                    delete seriesToUpdate.projectedDiffs[shiftOccurrenceId];
                }
            }

            // If the shift occurrence was previously in the detached diffs collection, we need to
            // remove the reference to its previous id.
            if (seriesToUpdate.detachedDiffs?.[shiftOccurrenceId]) {
                delete seriesToUpdate.detachedDiffs[shiftOccurrenceId];
            }

            // Retrieve the series that the shift occurrence should be associated with now.
            // This may be the same as the original series containing it, but could be different if the start date and time of the shift was edited.
            const [updatedSeriesIdx, updatedContainingSeries] = getShiftSeriesFromOccurrenceDateTime(toUpdate, newOccurrenceIdParts.date);

            // Place the detached diff on the appropriate series.
            if (updatedContainingSeries.id != seriesToUpdate.id) {
                if (!updatedContainingSeries.detachedDiffs) {
                    updatedContainingSeries.detachedDiffs = {};
                }
                updatedContainingSeries.detachedDiffs[newOccurrenceId] = occurrenceDiffToUpdate;
            } else {
                if (!seriesToUpdate.detachedDiffs) {
                    seriesToUpdate.detachedDiffs = {};
                }
                seriesToUpdate.detachedDiffs[newOccurrenceId] = occurrenceDiffToUpdate;
            }

            // Lastly, we update to shift's series collection with either one or two updated series (depending on the type of edit to the occurrence).
            toUpdate.series = toUpdate.series.map(series => {
                // If seriesToUpdate and updatedContainingSeries are the same, then the else-if portion of the conditional below will never be hit.
                if (series.id == seriesToUpdate.id) {
                    return seriesToUpdate;
                } else if (series.id == updatedContainingSeries.id) {
                    return updatedContainingSeries;
                }
                return series;
            })

        } else {
            // No change to the shift occurrence ID means we already know the series that this occurrence belongs
            // and can simply update it.
            if (!seriesToUpdate.projectedDiffs) {
                seriesToUpdate.projectedDiffs = {};
            }

            // Insert new occurrence diff into this series' collection of diffs
            seriesToUpdate.projectedDiffs[shiftOccurrenceId] = occurrenceDiffToUpdate;

            // Then we find the series in the collection of all the shift's series
            // and replace it with the udpated version of itself.
            toUpdate.series = toUpdate.series.map(series => {
                if (series.id == seriesToUpdate.id) {
                    return seriesToUpdate;
                }
                return series;
            })
        }
    } else {
        // Bulk Edit shift series
        if (shiftOccurrenceId) {
            // Edit all shift series from a specific occurrence on
            const [seriesIdx, series] = getShiftSeriesFromShiftOccurrenceId(toUpdate, shiftOccurrenceId);
            // Identify which shift occurrences in the series occur before/after this shift.
            // Split, clone, and insert the series, where necessary.
            const updateStartIdx = splitAndInsertShiftSeries(toUpdate, seriesIdx, shiftOccurrenceId);
            toUpdate.series.map((series, idx) => {
                if (idx >= updateStartIdx) {
                    applyUpdateToShiftSeries(series, updates.shiftSeriesUpdates);
                }
                return series;
            })
        } else {
            // Edit all shift series
            toUpdate.series.map(series => {
                applyUpdateToShiftSeries(series, updates.shiftSeriesUpdates);
                return series;
            })
        }
    }
}

// TODO: This will probably need the uuid param that gets passed to applyUpdateToShift, in the event that a new series needs to be created
function splitAndInsertShiftSeries(shift: Omit<Shift, 'createdAt' | 'updatedAt'>, seriesIdx: number, shiftOccurrenceId: string): number {
    const originalSeries: ShiftSeries = shift.series[seriesIdx];
    const splitDate: Date = new Date(getShiftOccurrenceDateStrFromId(shiftOccurrenceId));

    // If the shift occurrence we want to split the series on is the first in the shift series,
    // then we don't need to split the series at all. We return the same index that was provided,
    // since that still indicates where to find the series to begin the updates.
    // TODO: Can't pivot off date alone, because there may be multiple shifts on the same day.
    // We need to figure out if this shift is truly the first in the series.

    // NOTE: If there are multiple occurrences on the same date for a shift series, that means
    // at least one of those occurrences is detached. The detached occurrence may or may not
    // be the occurrence that we're splitting on.
    if (splitDate == originalSeries.startDate) {
        return seriesIdx;
    }

    // Incoming series to split:
    // End Date
    // Repititions
    // No End

    // If the series was set to repeat for a specified number of repititions, we clear that value.
    // originalSeries.recurrence.until.repititions = null;

    // Set the original series to end on the same date that the new series begins?
    originalSeries.recurrence.until.date = new Date(splitDate);
    originalSeries.recurrence.until.date.setDate(originalSeries.recurrence.until.date.getDate() - 1);

    // Any time we split a series, the previous series runs up until the start
    // date and time of the first occurrence in the new series.
    // Series:
    // detached diffs: { W: { 10am - 11am}}

    // M: 2-3pm
    // W: [10am-11am]*, 2pm-3pm
    // F: 2-3pm

    // Original Series:
    // Start date: Monday 2pm,
    // End date: Wed. 2pm.

    // New Series:
    // Start date: Wed. 2pm
    // End date: infinite


    // M: 2-3pm
    // W: 2pm-3pm*
    // F: 2-3pm


    /*
    Shift Definition:
        - repitition = 6
        - recurrence: m,w,f

    Shift Series:
        - Series [0]:
            - M (0)
            - W (0)
            - F (0)
            - M (1)
            - W (1)
            - F (1)

    - Edit "this and all future" on M(1):
        - recurrence: t,th,s

    Shift Series:
        - Series [0]: [end date gets updated]
            - M (0)
            - W (0)
            - F (0)

        - Series [1]:
            - T (1)
            - TH (1)
            - S (1)

    - Options for how to handle [delete "W (0)"]:
        - [Current behavior]: we allow the series to project a new occurrence within the other constraints (i.e. end date, etc.),
            because deleted shifts don't count towards the repitition limit.
        - In shiftStore when we keep track of the number of repititions a user specified,
            we can also count deleted occurrences towards that limit.
    */


    return seriesIdx + 1;
}

function insertOrGetSeries(startDate: string) {
    const currSeriesIdx = this.findSeriesIdxBeforeOrOn(startDate);
    let currSeries = this.sortedSeries[currSeriesIdx];

    if (currSeries.startDate != startDate) {
        const clone = currSeries.clone()

        clone.startDate = startDate

        // TODO: need to split occurences between the two on the start date

        // add the new one into the sorted array
        this.sortedSeries.splice(currSeriesIdx + 1, 0, clone)

        return currSeriesIdx + 1
    } else {
        return currSeriesIdx
    }
}

export function applyUpdateToShiftOccurrenceDiff(toUpdate: ShiftOccurrenceDiff, diff: ShiftOccurrenceUpdate, uuid: string) {
    // Update all of the replaced properties on this shift occurrence diff
    for (const prop in diff.replacedProperties) {
        toUpdate[prop] = diff.replacedProperties[prop]
    }

    // Update the positions if we have any updates
    if (diff.positionUpdates.addedItems.length
        || diff.positionUpdates.itemUpdates.length
        || diff.positionUpdates.removedItems.length) {
            if (!toUpdate.positions) {
                toUpdate.positions = [];
            }
            toUpdate.positions = projectPositionUpdates(toUpdate.positions, diff.positionUpdates);
    }

    // If the replaced props include an update to the shift occurrence start date,
    // we need to update the occurrence id to refelect that.
    if (diff.replacedProperties.dateTimeRange?.startDate) {
        // Keep the current detached id portion of the id if it already exists,
        // otherwise use the supplied uuid value.
        const currentOccurrenceIdParts = getPartsFromShiftOccurrenceId(diff.id);
        toUpdate.id = getShiftOccurrenceIdFromParts(toUpdate.shiftId,
                                                    toUpdate.dateTimeRange.startDate,
                                                    currentOccurrenceIdParts.detachedId || uuid)
    }
}

export function applyUpdateToShiftSeries(toUpdate: ShiftSeries, diff: ShiftSeriesUpdate) {
    // Update all of the replaced properties on this shift occurrence diff
    for (const prop in diff.replacedProperties) {
        toUpdate[prop] = diff.replacedProperties[prop]
    }

    toUpdate.positions = projectPositionUpdates(toUpdate.positions, diff.positionUpdates);
}

function getShiftSeriesAndOccurrenceDiff(shift: Omit<Shift, 'createdAt' | 'updatedAt'>, shiftOccurrenceId: string): [ShiftSeries, ShiftOccurrenceDiff] {
    // Identify the series that contains this shift occurrence diff if it exists.
    const [seriesIdx, series] = getShiftSeriesFromShiftOccurrenceId(shift, shiftOccurrenceId);

    // If a diff for this occurrence exists, then we return that object. Otherwise create the minimal ShiftOccurrenceDiff
    // with just its own id and a reference to the shift.
    const diff: ShiftOccurrenceDiff = series.detachedDiffs?.[shiftOccurrenceId]
                                        ? series.detachedDiffs[shiftOccurrenceId]
                                        : series.projectedDiffs?.[shiftOccurrenceId]
                                            ? series.projectedDiffs[shiftOccurrenceId]
                                            : {
                                                id: shiftOccurrenceId,
                                                shiftId: shift.id
                                            };

    return [series, diff];
}

function hasOccurrenceUpdates(shiftUpdates: ShiftUpdates): boolean {
    return !!shiftUpdates.shiftSeriesUpdates.shiftOccurrenceUpdate;
}


export function mergeEditShiftUpdatesForBulkShifts(toUpdate: ShiftUpdates, diff: EditShiftUpdates, newPositionIds: Set<string>) {
    const props = exhaustiveStringTuple<keyof ReplaceableShiftSeriesProps>()("title", "description", "recurrence");

    const seriesUpdate: ShiftSeriesUpdate = {
        replacedProperties: {},
        positionUpdates: {
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
}

export function mergeEditShiftUpdatesForShiftOccurrence(occurrenceId: string, toUpdate: ShiftUpdates, diff: EditShiftUpdates, newPositionIds: Set<string>) {
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
        shiftOccurrenceUpdate: occurrenceUpdates
    }

    // Lastly, push the series updates to the top-level shift updates.
    toUpdate.shiftSeriesUpdates = shiftSeriesUpdate;
}