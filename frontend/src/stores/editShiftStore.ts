import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { userStore, organizationStore, IEditShiftStore, shiftStore } from './interfaces';
import { DefaultRoleIds, Position, PositionSetUpdate, ShiftUpdates, ShiftOccurrence, Shift, EditShiftUpdates, RecurringTimeConstraints, DateTimeRange, ShiftSeries } from '../../../common/models';
import { OrgContext, ShiftContext } from '../../../common/api';
import { projectPositionUpdates, mergePositionSetUpdates, mergeEditShiftUpdatesForBulkShifts, mergeEditShiftUpdatesForShiftOccurrence } from '../../../common/utils';
import { api } from '../services/interfaces';
import { getShiftIdFromShiftOccurrenceId } from '../../../common/utils/shiftUtils';

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

    // The editShift API has the following contract:
    // 1) IF there is no shift occurrence id provided, then the server will attempt to apply the updates to all series.
    // IF the optional shift occurrence id is provided, then one of two paths are available: 
    // 2) If the updates sent to the server have a value provided for the shiftOccurrenceUpdates property, then
    // the server expects that the provided updates should be applied only to the corresponding shift occurrence.
    // 3) If the updates do not contain shiftOccurrenceUpdates, it must contain replacedProperties and/or
    // positionUpdates at the shift series level. Since a shift occurrence id is provided, the server applies
    // the shift series updates to all series moving forward beginning at the series generated for the shift, cloning
    // and generating a new shift beginning at the specified occurrence, if necessary.
    async editAllShifts() {
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
                replacedProperties: {},
                positionUpdates: {
                    addedItems: [],
                    removedItems: [],
                    itemUpdates: []
                }
            }
        }

        mergeEditShiftUpdatesForBulkShifts(updatesForServer, this.updates, this.newPositionIds);

        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer);
        shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    async editThisAndFutureShifts() {
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
                replacedProperties: {},
                positionUpdates: {
                    addedItems: [],
                    removedItems: [],
                    itemUpdates: []
                }
            }
        }

        mergeEditShiftUpdatesForBulkShifts(updatesForServer, this.updates, this.newPositionIds);
        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer, this.shiftOccurrenceId);
        shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    async editShiftOccurrence() {
        const updatesForServer: ShiftUpdates = {
            shiftSeriesUpdates: {
                shiftOccurrenceUpdate: {
                    id: '',
                    replacedProperties: {},
                    positionUpdates: {
                        addedItems: [],
                        removedItems: [],
                        itemUpdates: []
                    }
                }
            }
        }
        
        mergeEditShiftUpdatesForShiftOccurrence(this.shiftOccurrenceId, updatesForServer, this.updates, this.newPositionIds);

        const updatedShift = await api().editShift(this.shiftContext(this.shiftId), updatesForServer, this.shiftOccurrenceId);
        shiftStore().updateOrAddShift(updatedShift);

        this.newPositionIds.clear();
    }

    loadShift(shiftOccurrenceId: string) {
        this.clear()
        this.shiftOccurrenceId = shiftOccurrenceId;
        this.shiftId = getShiftIdFromShiftOccurrenceId(shiftOccurrenceId);
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

    canUpdateSingleOccurrence() {
        // If any property is edited such that it cannot be applied to other shifts,
        // this flag should be set to false
        // Conditions: No changes to the recurrence value
        // return !this.editToRecurrence;
        return !this.updates.shiftSeriesUpdates.replacedProperties.recurrence;;
    }

    // computed getters that update whenever the underlying shift changes or the diffs 
    // generated by the components in this form change.
    get shift(): Shift {
        return shiftStore().shifts.get(this.shiftId)
    }

    get shiftSeries(): ShiftSeries {
        return shiftStore().getShiftSeriesFromShiftOccurrenceId(this.shiftOccurrenceId)[1];
    }

    get shiftOccurrence(): ShiftOccurrence {
        return shiftStore().getShiftOccurrence(this.shiftOccurrenceId);
    }

    get title() {
        // Check if we have a replacement value for the title property.
        // Return the replacement value if it exists, otherwise return the current
        // title from the shift occurence.
        return this.updates.shiftSeriesUpdates.replacedProperties.title == undefined
            ? this.shiftOccurrence.title
            : this.updates.shiftSeriesUpdates.replacedProperties.title
    }

    set title(val: string) {
        // TODO: Should we check if value is equal to current shift occurrence value?
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
        // TODO: Should we check if value is equal to current shift occurrence value?

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
        // TODO: Should we check if value is equal to current shift occurrence value?

        // We don't know yet if this change will be applied to a single shift occurrence or the shift definition.
        // But, if we have a change to the recurrence already, then we know these edits will apply to a bulk edit.
        // We can add this edit to the recurrence edit, and skip updating the dateTimeRange (else statement).
        if (this.updates.shiftSeriesUpdates.replacedProperties.recurrence) {
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.startDate = val.startDate;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.endDate = val.endDate;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.startTime = val.startTime;
            this.updates.shiftSeriesUpdates.replacedProperties.recurrence.endTime = val.endTime;
        }

        // Add this edit to the dateTimeRange in the shiftSeriesUpdates object
        this.updates.shiftSeriesUpdates.replacedProperties.dateTimeRange = val;
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
    }

    // validations
    get titleValid() {
        return !!this.title
    }
}