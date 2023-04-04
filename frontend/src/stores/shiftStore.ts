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
import { DateAdapter, IRuleOptions, OccurrenceGenerator, OccurrenceIterator, Rule, RuleOption, RuleOptionError, Schedule, StandardDateAdapter } from '../utils/rschedule'

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

    rRuleToPatchRecurrence(rrule: Rule): RecurringDateTimeRange {
        throw new Error('Method not implemented.');
    }

    patchRecurrenceToRRule(recurringDateTime: RecurringDateTimeRange): Rule {
        const frequencyMap: { [key in RecurringPeriod]: RuleOption.Frequency } = {
            [RecurringPeriod.Month]: 'MONTHLY',
            [RecurringPeriod.Week]: 'WEEKLY',
            [RecurringPeriod.Day]: 'DAILY'
        }

        console.log('Rule Start: ', recurringDateTime.startDate)
        const ruleOptions: IRuleOptions = {
            start: new Date(recurringDateTime.startDate),
            frequency: frequencyMap[recurringDateTime.every.period],
            interval: recurringDateTime.every.numberOf,
            // "The WKST rule part specifies the day on which the workweek starts"
            weekStart: DateAdapter.WEEKDAYS[0]
        }

        console.log('Creating rrule...', ruleOptions)

        if (recurringDateTime.until) {
            if (recurringDateTime.until.date) {
                ruleOptions.end = new Date(recurringDateTime.until.date);
            } else if (recurringDateTime.until.repititions) {
                // TODO: Are repititions for individual occurences or 
                // for the number of time periods? i.e. for a M/W/F evenet
                // that reoccurs every 2 weeks, with 12 repititions. Is that
                // 12 weeks of this series or 12 events?
                ruleOptions.count = recurringDateTime.until.repititions;
            }
        }

        console.log('Updated rrule with end limitation: ', ruleOptions)

        if (recurringDateTime.every.period == RecurringPeriod.Month) {
            if (recurringDateTime.every.dayScope) {
                ruleOptions.byDayOfMonth = [recurringDateTime.startDate.getDate()];
            } else if (recurringDateTime.every.weekScope) {
                // TODO: not implemented in input control yet
            }
        }

        // TODO: How to handle scenarios where the start day exists outside of the series?
        if (recurringDateTime.every.period == RecurringPeriod.Week) {
            ruleOptions.byDayOfWeek = recurringDateTime.every.days.map(x => DateAdapter.WEEKDAYS[x]);
        }

        // console.log('Updated rrule based on recurrence period: ', ruleOptions);

        return new Rule(ruleOptions);
    }

    getRRuleSchedule(rules: Rule[]): Schedule {
        return new Schedule({
            rrules: rules
        });
    }

    projectRRuleSchedule(recurringDateTime: RecurringDateTimeRange, finalProjection: Date): OccurrenceIterator {
        const rule = this.patchRecurrenceToRRule(recurringDateTime);
        const schedule = this.getRRuleSchedule([rule]);
        return schedule.occurrences({end: finalProjection})
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