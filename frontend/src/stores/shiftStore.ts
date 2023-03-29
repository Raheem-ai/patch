import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IShiftStore, IUserStore, manageAttributesStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { ClientSideFormat, OrgContext, RequestContext } from '../../../common/api';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftInstancesFilter, CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchEventType, PatchPermissions, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role, Shift, RecurringDateTimeRange, RecurringPeriod, ShiftInstance, PositionStatus, DateTimeRange } from '../../../common/models';
import { api } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { userHasAllPermissions } from '../utils';
import { usersAssociatedWithRequest } from '../../../common/utils/requestUtils';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';
import moment from 'moment';

const mockInstanceDiff: ShiftInstance = {
    shiftId: 'mock-id',
    id: 'mock-id-0',
    chat: null,
    title: 'Different Title',
}

const recurrence: RecurringDateTimeRange = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 4,
        days: []
    },
    startDate: moment().hour(22).minutes(5).toDate(), // Today @ 10:05pm 
    endDate: moment().hour(22).minutes(5).add(2, 'hours').toDate(), // Tomorrow @ 12:05am 
};

const mockShift: Shift = {
    createdAt: '',
    updatedAt: '',
    id: 'mock-id',
    displayId: 'mock-display-id',
    orgId: 'mock-org-id',
    title: 'Mock Shift Title',
    description: 'This is a mock shift!',
    recurrence: recurrence,
    instanceDiffs: [ mockInstanceDiff ],
    positions: [],
    positionStatus: PositionStatus.Empty
}

@Store(IShiftStore)
export default class ShiftStore implements IShiftStore {
    loading = false;

    @securelyPersistent({
        // TODO: create standard decorators to handle this de/serialization
        // Could also allow for serialization into classes from raw json 
        resolvers: {
            toJSON: (val: ObservableMap) => {
                return val.entries ? val.entries() : {}
            },
            fromJSON: (entries) => {
                return new ObservableMap(entries)
            }
        }
    }) shifts: ObservableMap<string, Shift> = new ObservableMap();

    @persistent() shiftInstancesFilter = ShiftInstancesFilter.All;
    @persistent() shiftsFilter = ShiftsRolesFilter.All;
    @persistent() filter = {
        instancesFilter: this.shiftInstancesFilter,
        shiftsFilter: this.shiftsFilter,
    };

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();
        if (userStore().signedIn) {
            await this.getShiftsAfterSignin()
        } else {
            when(() => userStore().signedIn, this.getShiftsAfterSignin)
        }
    }

    get shiftsArray() {
        return Array.from(this.shifts.values());
    }

    shiftIsFull(shiftInstance: ShiftInstance): boolean {
        // If any positions on a shift have fewer than the minimum
        // number of users joined, then the position is not full.
        return !shiftInstance.positions.some(position => position.joinedUsers.length < position.min);
    }

    shiftHasRoles(shift: Shift) {
        if (this.shiftsFilter == ShiftsRolesFilter.All) {
            return true;
        } else {
            // TODO
            return false;
        }
    }

    get filteredShifts(): Shift[] {
        return this.shiftsArray.filter(s => this.shiftHasRoles(s));
    }

    get filteredShiftInstances(): ShiftInstance[] {
        const filteredInstances = [];
        // Use filteredShifts property to get Shifts that satisfy
        // the current role filters. Then we filter that list even
        // further to satisfy the position fulfillment criteria.
        this.filteredShifts.forEach(shift => {
            // Return all instances regardless of joined users
            if (this.shiftInstancesFilter == ShiftInstancesFilter.All) {
                filteredInstances.push(...shift.instanceDiffs);
            } else {
                // Only return instances that are unfilfilled (need users to join)
                filteredInstances.push(...shift.instanceDiffs.filter(instance => {
                    return !this.shiftIsFull(instance);
                }));
            }
        });

        return filteredInstances;
    }

    projectRecurringDateTimes(recurringDateTime: RecurringDateTimeRange, finalProjectionDate: Date) {
        console.log('projectRecurringDateTimes: ', recurringDateTime);
        console.log('Until Date: ', finalProjectionDate);
        const instanceDateTimes: DateTimeRange[] = [];
        let shiftStart = recurringDateTime.startDate;
        let shiftEnd = recurringDateTime.endDate;
        const eventDuration = shiftEnd.getTime() - shiftStart.getTime();

        // Limit the projected series to end by the sooner of the user-selected end date OR
        // the end date based on the view requesting these instances (i.e. the finalProjection parameter)
        if (recurringDateTime.until && recurringDateTime.until.date && recurringDateTime.until.date < finalProjectionDate) {
            finalProjectionDate = recurringDateTime.until.date;
        }
        console.log('Updated until date: ', finalProjectionDate);

        let continueSeries = true;
        let weekRecurrenceIndex = 0;
        let repititions = 0;
        while (continueSeries) {
            if (recurringDateTime.every.period == RecurringPeriod.Month) {
                if (recurringDateTime.every.dayScope) {

                } else if (recurringDateTime.every.weekScope) {

                }
            } else if (recurringDateTime.every.period == RecurringPeriod.Week) {
                // If we're on the very first instance of this shift, identify which day
                // of the week it is and ensure that the weekRecurrenceIndex is correct.
                if (shiftStart == recurringDateTime.startDate) {
                    const shiftDay = shiftStart.getDay();
                    weekRecurrenceIndex = recurringDateTime.every.days.indexOf(shiftDay);
                    console.log('First Shift Occurrence (index, day): ', weekRecurrenceIndex, shiftDay);
                }

                console.log('adding new date: ', {
                    startDate: shiftStart,
                    endDate: shiftEnd
                });

                // Add the current shift's datetime to the collection
                instanceDateTimes.push({
                    startDate: new Date(shiftStart),
                    endDate: new Date(shiftEnd)
                });

                // Check if we've added all of the shifts for the current week.
                // If so, reset the weekRecurrenceCount and skip ahead to the first
                // shift date for the next week.
                weekRecurrenceIndex++;
                if (weekRecurrenceIndex == recurringDateTime.every.days.length) {
                    console.log('reached end of week...', weekRecurrenceIndex);
                    repititions++;
                    weekRecurrenceIndex = 0;

                    // Get the earliest shift day for next week
                    const currentStartDate = moment(shiftStart);
                    const firstShiftDay = recurringDateTime.every.days[0];
                    const currentWeekFirstShift = currentStartDate.clone().day(firstShiftDay);

                    // TODO: put in helper
                    // Add a week to the earliest shift from the current week
                    console.log('jumping to next week...');
                    shiftStart.setDate(currentWeekFirstShift.toDate().getDate() + 7*recurringDateTime.every.numberOf);
                    shiftEnd.setDate(currentWeekFirstShift.add(eventDuration).toDate().getDate() + 7*recurringDateTime.every.numberOf);
                } else {
                    // If we have not added all shifts this week, move to the next shift day.
                    console.log('moving to next shift day...', weekRecurrenceIndex);

                    const nextShiftDay = moment(shiftStart).clone().day(recurringDateTime.every.days[weekRecurrenceIndex]);
                    console.log('NEXT SHIFT DAY: ', nextShiftDay);

                    shiftStart = nextShiftDay.toDate();
                    shiftEnd = nextShiftDay.add(eventDuration).toDate();
                    console.log('New Shift start and end: ', {
                        startDate: shiftStart,
                        endDate: shiftEnd
                    });
                }
            } else if (recurringDateTime.every.period == RecurringPeriod.Day) {
                console.log('adding new date: ', {
                    startDate: shiftStart,
                    endDate: shiftEnd
                });

                // Add the current shift's datetime to the collection
                instanceDateTimes.push({
                    startDate: new Date(shiftStart),
                    endDate: new Date(shiftEnd)
                });

                console.log('incrementing next event...');

                // Increment the event date according to the time period frequency
                shiftStart.setDate(shiftStart.getDate() + recurringDateTime.every.numberOf);
                shiftEnd.setDate(shiftEnd.getDate() + recurringDateTime.every.numberOf);
                repititions++;
            }

            // Stop the series if we've reached the repitition limit
            if (recurringDateTime.until && recurringDateTime.until.repititions) {
                // TODO: For weeks it'll be the number of weekly repititions, not just the
                // length of the collection.
                console.log('Repititions: ', repititions);
                console.log('Repitition Limit: ', recurringDateTime.until.repititions);
                continueSeries = repititions < recurringDateTime.until.repititions;
            }

            // Stop the series if we've reached the last projection date
            if (continueSeries) {
                // TODO: should this be comparing start or end dates from the final projection?
                continueSeries = shiftStart < finalProjectionDate;
            }
        }

        return instanceDateTimes;
    }


    async loadUntil(predicate: () => Promise<any>): Promise<void> {
        this.loading = true
        await predicate()
        runInAction(() => this.loading = false);
    }

    setFilter = async (filter: ShiftsFilter): Promise<void> => {
        this.filter = filter;
        await this.getShifts();
    }

    setInstancesFilter = async (filter: ShiftInstancesFilter): Promise<void> => {
        this.filter.instancesFilter = filter;
        await this.getShifts();
    }

    setShiftsFilter = async (filter: ShiftsRolesFilter): Promise<void> => {
        this.filter.shiftsFilter = filter;
        await this.getShifts();
    }

    async getShifts(shiftIds?: string[]): Promise<void> {
        runInAction(() => {
            this.shifts.merge({
                [mockShift.id]: mockShift
            });
        })
    }

    async getShift(shiftId: string): Promise<void> {
        runInAction(() => {
            this.shifts.merge({
                [mockShift.id]: mockShift
            });
        })
    }

    pushShift(shiftId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    tryPopShift(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    getShiftsAfterSignin = async () => {
        await this.getShifts([]);

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getShiftsAfterSignin)
        })
    }

    clear(): void {
        runInAction(() => {
            this.shifts.clear();
        })
    }
}