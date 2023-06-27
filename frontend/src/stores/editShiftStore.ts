import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { CreateReqData, IRequestStore, IEditRequestStore, IUserStore, userStore, requestStore, organizationStore, IEditShiftStore, shiftStore } from './interfaces';
import { AddressableLocation, ArrayCollectionUpdate, CategorizedItem, CategorizedItemUpdates, DefaultRoleIds, HelpRequest, MinHelpRequest, Position, PositionUpdate, PositionSetUpdate, ReplaceableRequestProps, RequestPriority, RequestType, RequestUpdates, ShiftUpdates, ShiftOccurrence, Shift, ShiftOccurrenceSetUpdate, RecurringDateTimeRange, EditShiftUpdates, ReplaceableShiftOccurrenceProps, ShiftOccurrenceUpdate, RecurringTimeConstraints, DateTimeRange, ShiftSeries } from '../../../common/models';
import { OrgContext, RequestContext, ShiftContext } from '../../../common/api';
import { projectArrayUpdates, projectPositionUpdates, applyUpdateToPosition, categorizedItemToString, mergeArrayCollectionUpdates, mergePositionUpdates, mergePositionSetUpdates, projectShiftOccurrenceUpdates, mergeShiftOccurrenceSetUpdates, mergeEditShiftUpdatesForBulkShifts, mergeEditShiftUpdatesForShiftOccurrence } from '../../../common/utils';
import { api } from '../services/interfaces';
import { DateTime } from '@rschedule/core';

@Store(IEditShiftStore)
export default class EditShiftStore implements IEditShiftStore {
    shiftId: string
    shiftOccurrenceId: string

    // NOTE: these updates resolve all local updates vs the server 
    // ...ie. we have to merge them locally to handle multiple edits before a server sync
    updates: EditShiftUpdates = {
        shiftSeriesUpdates: {
            replacedProperties: {},
            positionUpdates: {
                addedItems: [],
                removedItems: [],
                itemUpdates: []
            }
        }
    }

    newPositionIds = new Set<string>();

    async init() {
        await organizationStore().init()
    }

    constructor() {
        makeAutoObservable(this)
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    shiftContext(shiftId: string): ShiftContext {
        return {
            shiftId,
            ...this.orgContext()
        }
    }

    onRoleDeletedUpdate(shiftId: string) {
        // currently a noop because the position component handles the default case and we only send diffs to the server
        // ie. unlike createRequestStore
    }

    async editAllShifts() {
        console.log('EDIT ALL SHIFTS...');
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
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
        }

        mergeEditShiftUpdatesForBulkShifts(updatesForServer, this.updates, this.newPositionIds);

        console.log('MAKING EDIT SHIFT API CALL...');
        console.log(`UPDATES FOR SERVER: ${JSON.stringify(updatesForServer)}`);
        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer);
        console.log(`UPDATED SHIFT: ${JSON.stringify(updatedShift)}`);
        // TODO: Backend not returning proper shift yet
        // shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    async editThisAndFutureShifts() {
        console.log('EDIT ALL SHIFTS...');
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
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
        }

        mergeEditShiftUpdatesForBulkShifts(updatesForServer, this.updates, this.newPositionIds);

        console.log('MAKING EDIT SHIFT API CALL...');
        console.log(`UPDATES FOR SERVER: ${JSON.stringify(updatesForServer)}`);
        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer);
        console.log(`UPDATED SHIFT: ${JSON.stringify(updatedShift)}`);
        // TODO: Backend not returning proper shift yet
        // shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    async editShiftOccurrence() {
        console.log('EDIT SHIFT OCCURRENCE...');
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
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
        }
        
        mergeEditShiftUpdatesForShiftOccurrence(this.shiftOccurrenceId, this.shiftSeries, updatesForServer, this.updates, this.newPositionIds);

        console.log('MAKING EDIT SHIFT API CALL...');
        console.log(`UPDATES FOR SERVER: ${JSON.stringify(updatesForServer)}`);
        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer);
        // TODO: Backend not returning proper shift yet
        // shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    loadShift(shiftOccurrenceId: string) {
        this.clear()
        this.shiftOccurrenceId = shiftOccurrenceId;
        this.shiftId = shiftStore().getShiftIdFromShiftOccurrenceId(shiftOccurrenceId);
    }

    clear() {
        this.updates = {
            shiftSeriesUpdates: {
                replacedProperties: {},
                positionUpdates: {
                    addedItems: [],
                    removedItems: [],
                    itemUpdates: []
                }
            }
        }

        this.newPositionIds.clear();
    }

    get shift(): Shift {
        // console.log('editShiftStore::get#Shift...')
        return shiftStore().shifts.get(this.shiftId)
    }

    get shiftSeries(): ShiftSeries {
        // console.log('editShiftStore::get#ShiftSeries...')
        return shiftStore().getShiftSeriesFromShiftOccurrenceId(this.shiftOccurrenceId);
    }

    get shiftOccurrence(): ShiftOccurrence {
        // console.log('editShiftStore::get#ShiftOccurrence...')
        return shiftStore().getShiftOccurrence(this.shiftOccurrenceId);
    }

    /*
    get shiftOccurrences(): { [occurenceId: string]: ShiftOccurrence } {
        const cpy: { [occurenceId: string]: ShiftOccurrence } = JSON.parse(JSON.stringify(this.shift.occurrenceDiffs));

        // map existing occurrence diffs
        const occurrencesProjection: { [occurenceId: string]: ShiftOccurrence } = projectShiftOccurrenceUpdates(cpy, this.updates.shiftOccurrenceUpdates);

        return occurrencesProjection;
    }

    saveOccurrencesUpdates(inputDiff: ShiftOccurrenceSetUpdate) {
        mergeShiftOccurrenceSetUpdates(this.updates.shiftOccurrenceUpdates, inputDiff, this.newShiftOccurrenceIds, this.newPositionIdsByOccurrence);
    }
    */

    // computed getters that update whenever the underlying shift changes or the diffs 
    // generated by the components in this form change.
    canUpdateSingleOccurrence() {
        // TODO: If any property is edited such that it cannot be applied to other shifts,
        // this flag should be set to false
        // Conditions:
        // No changes to the recurrence value
        return !this.updates.shiftSeriesUpdates.replacedProperties.recurrence;;
    }

    // replaced properties...
    // - sets update the store's diff
    // - gets return the value from the store's diff or defaults to the showing what the
    // base request has
    get title() {
        // Check if we have a replacement value for the title property.
        // Return the replacement value if it exists, otherwise return the current
        // title from the shift occurence.
        return this.updates.shiftSeriesUpdates.replacedProperties.title == undefined
            ? this.shiftOccurrence.title
            : this.updates.shiftSeriesUpdates.replacedProperties.title
    }

    set title(val: string) {
        // TODO: Check if value is equal to current shift occurrence value.

        // Set the new value on the shift series update object.
        this.updates.shiftSeriesUpdates.replacedProperties.title = val;
    }

    get description() {
        // Check if we have a replacement value for the description property.
        // Return the replacement value if it exists, otherwise return the current
        // description from the shift occurence.
        return this.updates.shiftSeriesUpdates.replacedProperties.description == undefined
            ? this.shiftOccurrence.description
            : this.updates.shiftSeriesUpdates.replacedProperties.description
    }

    set description(val: string) {
        // TODO: Check if value is equal to current shift occurrence value.

        // Set the new value on the shift series update object.
        this.updates.shiftSeriesUpdates.replacedProperties.description = val;
    }

    get positions(): Position[] {
        // create a deep copy because this projection function edits both position objects and their array
        // and we don't want to actually change this.request.positions
        const cpy: Position[] = JSON.parse(JSON.stringify(this.shiftOccurrence.positions))

        // map existing positions
        const positionsProjection = projectPositionUpdates(cpy, this.updates.shiftSeriesUpdates.positionUpdates)

        // make sure top level function doesn't break when role gets deleted 
        // that is on a position...eventually the data will catchup or the user will
        // add a diff to change it
        positionsProjection.forEach(pos => {
            if (!organizationStore().roles.get(pos.role)) {
                pos.role = DefaultRoleIds.Anyone
            }
        })

        return positionsProjection
    }

    // These consume the diffs coming back from each input that works off of diffs 
    // and merges it with the store's diff (of the latest db version) we already have 
    savePositionUpdates(inputDiff: PositionSetUpdate) {
        mergePositionSetUpdates(this.updates.shiftSeriesUpdates.positionUpdates, inputDiff, this.newPositionIds)
    }

    // An edit to the date portion of the date time range
    get dateTimeRange() {
        return this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange == undefined
            ? this.shiftOccurrence.dateTimeRange
            : this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange;
    }

    set dateTimeRange(val: DateTimeRange) {
        // TODO: Check if all values are equal to the current shift occurrence's values and if so, remove from edits.
        // 1. Remove from this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange
        // 2. Set this.updates.shiftSeriesUpdates.replacedProperties.recurrence values to this.shiftOccurrence.dateTimeRange values.

        // We don't know yet if this change will be applied to a single shift occurrence or the shift definition.
        // So, if we have a change to the recurrence already, then add this edit to the recurrence edit
        if (this.updates.shiftSeriesUpdates.replacedProperties.recurrence) {
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.startDate = val.startDate;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.endDate = val.endDate;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.startTime = val.startTime;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.endTime = val.endTime;
            console.log(`New date time range value (recurrence): ${JSON.stringify(this.updates.shiftSeriesUpdates.replacedProperties.recurrence)}`);
        }

        // Also add this edit to the dateTimeRange in the shiftSeriesUpdates object
        this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange = val;
        console.log(`New date time range value (date time only): ${JSON.stringify(this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange)}`);
    }

    get recurringTimeConstraints() {
        // Extract the relevant recurring time constraints parts of the recurrence value
        // from either the replacedProperties edits or the shift definition.
        return this.updates.shiftSeriesUpdates.replacedProperties.recurrence == undefined
                ? {
                    every: this.shiftSeries.recurrence.every,
                    until: this.shiftSeries.recurrence.until
                } : {
                    every: this.updates.shiftSeriesUpdates.replacedProperties.recurrence.every,
                    until: this.updates.shiftSeriesUpdates.replacedProperties.recurrence.until
                }
    }

    set recurringTimeConstraints(val: RecurringTimeConstraints) {
        // When this is changed, set the properties of the recurrence that correspond to the RecurringTimeContraints parameter
        // we've been given. Next, check if there is already an edit to the dateTimeRange as well. 
        // If so, pull the dateTimeRange edits into this recurrence edit. Otherwise, set the DateTimeRange portion of the
        // recurrence based on the shift occurence's value.
        this.updates.shiftSeriesUpdates.replacedProperties.recurrence = {
            every: val.every,
            until: val.until,
            ...(this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange) && {
                startDate: this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange.startDate,
                startTime: this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange.startTime,
                endDate: this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange.endDate,
                endTime: this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange.endTime
            },
            ...(!this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange) &&
            {
                startDate: this.shiftOccurrence.dateTimeRange.startDate,
                startTime: this.shiftOccurrence.dateTimeRange.startTime,
                endDate: this.shiftOccurrence.dateTimeRange.endDate,
                endTime: this.shiftOccurrence.dateTimeRange.endTime
            } 
        }

        console.log(`New recurring time constraints value: ${this.updates.shiftSeriesUpdates.replacedProperties.recurrence}`);
    }

    // validations
    get titleValid() {
        return !!this.title
    }
}