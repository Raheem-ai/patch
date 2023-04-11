import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IShiftStore, IUserStore, manageAttributesStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { ClientSideFormat, OrgContext, RequestContext } from '../../../common/api';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftNeedsPeopleFilter, CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchEventType, PatchPermissions, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role, Shift, RecurringDateTimeRange, RecurringPeriod, ShiftOccurrence, PositionStatus, DateTimeRange } from '../../../common/models';
import { api } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { userHasAllPermissions } from '../utils';
import { usersAssociatedWithRequest } from '../../../common/utils/requestUtils';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';
import moment from 'moment';
import { DateAdapter, DateTime, IRuleOptions, OccurrenceGenerator, OccurrenceIterator, Rule, RuleOption, RuleOptionError, Schedule, StandardDateAdapter } from '../utils/rschedule'

const mockInstanceDiff: ShiftOccurrence = {
    shiftId: 'mock-id-1',
    id: 'mock-id-0',
    chat: null,
    title: 'Different Title',
}

const recurrence: RecurringDateTimeRange = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 1,
        days: [1,3,5]
    },
    until: {
        repititions: 20,
        date: null
    },
    startDate: new Date(moment().hour(22).minutes(5).toDate()), // Today @ 10:05pm 
    endDate: new Date(moment().hour(22).minutes(5).add(2, 'hours').toDate()), // Tomorrow @ 12:05am 
};

const mockShift: Shift = {
    createdAt: '',
    updatedAt: '',
    id: 'mock-id-1',
    displayId: 'mock-display-id-1',
    orgId: 'mock-org-id',
    title: 'Water Distribution',
    description: 'This is the first mock shift',
    recurrence: recurrence,
    occurrenceDiffs: {
        // TODO: Compose diff id
        [mockInstanceDiff.id]: mockInstanceDiff
    },
    positions: [],
    positionStatus: PositionStatus.Empty
}

const recurrence2: RecurringDateTimeRange = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 1,
        days: [1,3,5]
    },
    until: {
        repititions: 20,
        date: null
    },
    startDate: new Date(moment().hour(22).minutes(5).toDate()), // Today @ 10:05pm 
    endDate: new Date(moment().hour(22).minutes(5).add(2, 'hours').toDate()), // Tomorrow @ 12:05am 
};

const mockShift2: Shift = {
    createdAt: '',
    updatedAt: '',
    id: 'mock-id-2',
    displayId: 'mock-display-id-2',
    orgId: 'mock-org-id',
    title: 'No New Cops March',
    description: 'This is the second mock shift',
    recurrence: recurrence2,
    occurrenceDiffs: {},
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

    filter: ShiftsFilter = {
        needsPeopleFilter: ShiftNeedsPeopleFilter.All,
        rolesFilter: ShiftsRolesFilter.All
    };

    dateRange: DateTimeRange = {
        startDate: null,
        endDate: null,
    }

    constructor() {
        makeAutoObservable(this);
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

    shiftIsFull(shiftInstance: ShiftOccurrence): boolean {
        // If any positions on a shift have fewer than the minimum
        // number of users joined, then the position is not full.
        return !shiftInstance.positions.some(position => position.joinedUsers.length < position.min);
    }

    shiftHasRoles(shift: Shift) {
        if (this.filter.rolesFilter == ShiftsRolesFilter.All) {
            return true;
        } else {
            // TODO
            return false;
        }
    }

    get filteredShiftOccurrences(): ShiftOccurrence[] {
        const filteredOccurrences = [];

        if (this.dateRange.startDate == null || this.dateRange.endDate == null) {
            return filteredOccurrences;
        }

        this.shiftsArray.map(shift => {
            const shiftSchedule = new Schedule({
                rrules: [this.patchRecurrenceToRRule(shift.id, shift.recurrence)]
            });

            shiftSchedule.occurrences({ start: this.dateRange.startDate, end: this.dateRange.endDate }).toArray().map(occurrence => {
                // TODO: Compose shift occurrence ID, look up in diffs map
                filteredOccurrences.push({
                    id: `${shift.id}-${this.getDateString(occurrence.date)}`,
                    shiftId: shift.id,
                    chat: {
                        id: '',
                        messages: [],
                        lastMessageId: 0,
                        userReceipts: {}
                    },
                    // TODO: confirm proper use of date/end and duration properties from rSchedule
                    dateTimeRange: { startDate: occurrence.date, endDate: occurrence.end },
                    title: shift.title,
                    description: shift.description,
                    positionStatus: shift.positionStatus,
                    positions: JSON.parse(JSON.stringify(shift.positions))
                })
            })
        });

        filteredOccurrences.sort(function(occurrenceA, occurrenceB) {
            return new Date(occurrenceA.dateTimeRange.startDate).valueOf() - new Date(occurrenceB.dateTimeRange.startDate).valueOf();
        });

        return filteredOccurrences;
    }

    getDateString(date: Date): string {
        return `${date.getMonth()}-${date.getDate()}-${date.getFullYear()}`
    }

    patchRecurrenceToRRule(shiftId: string, recurringDateTime: RecurringDateTimeRange): Rule {
        console.log('patchRecurrenceToRRule: ', shiftId, recurringDateTime);
        const frequencyMap: { [key in RecurringPeriod]: RuleOption.Frequency } = {
            [RecurringPeriod.Month]: 'MONTHLY',
            [RecurringPeriod.Week]: 'WEEKLY',
            [RecurringPeriod.Day]: 'DAILY'
        }

        const ruleOptions: IRuleOptions = {
            start: new Date(recurringDateTime.startDate),
            duration: recurringDateTime.endDate.getTime() - recurringDateTime.startDate.getTime(),
            frequency: frequencyMap[recurringDateTime.every.period],
            interval: recurringDateTime.every.numberOf,
            // "The WKST rule part specifies the day on which the workweek starts"
            weekStart: DateAdapter.WEEKDAYS[0]
        }

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

        if (recurringDateTime.every.period == RecurringPeriod.Month) {
            if (recurringDateTime.every.dayScope) {
                // TODO: Is there some type of assertion to make here to please TypeScript?
                ruleOptions.byDayOfMonth = [recurringDateTime.startDate.getDate()];
            } else if (recurringDateTime.every.weekScope) {
                // TODO: not implemented in input control yet
            }
        }

        // TODO: How to handle scenarios where the start day exists outside of the series?
        if (recurringDateTime.every.period == RecurringPeriod.Week) {
            // TODO: How to handle no days of week specified in weekly rule? Maybe not possible?
            if (recurringDateTime.every.days.length == 0) {
                return null;
            }
            ruleOptions.byDayOfWeek = recurringDateTime.every.days.map(x => DateAdapter.WEEKDAYS[x]);
        }

        return new Rule(ruleOptions, { data: { shiftId: shiftId }});
    }

    getRRuleSchedule(rules: Rule[]): Schedule {
        return new Schedule({
            rrules: rules
        });
    }

    projectRRuleSchedule(recurringDateTime: RecurringDateTimeRange, dateRange: DateTimeRange): OccurrenceIterator {
        const rule = this.patchRecurrenceToRRule('mock-shift-id', recurringDateTime);
        const schedule = this.getRRuleSchedule([rule]);
        return schedule.occurrences({ start: dateRange.startDate, end: dateRange.endDate })
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

    setNeedsPeopleFilter = async (needsPeopleFilter: ShiftNeedsPeopleFilter): Promise<void> => {
        this.filter.needsPeopleFilter = needsPeopleFilter;
        await this.getShifts();
    }

    setRolesFilter = async (rolesFilter: ShiftsRolesFilter): Promise<void> => {
        this.filter.rolesFilter = rolesFilter;
        await this.getShifts();
    }

    getShiftIdFromOccurrenceId(shiftOccurrenceId: string): string {
        // TODO: Decompose ID into the parent shift ID and date
        return 'mock-id-1'
    }

    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence {
        const shiftId = this.getShiftIdFromOccurrenceId(shiftOccurrenceId);
        const parentShift = this.shifts.get(shiftId);
        return { id: '', shiftId: '', chat: null}
    }

    async getShifts(shiftIds?: string[]): Promise<void> {
        runInAction(() => {
            this.shifts.merge({
                [mockShift.id]: mockShift,
                [mockShift2.id]: mockShift2
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