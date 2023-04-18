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

const userIds = [
    "62da9696bfd645465b54236d",
    "62da9696bfd645465b54236f",
    "62da9696bfd645465b542373",
    "62da9695bfd645465b542366",
    "63e2f010c9c2a1001fed363d",
    "62da9696bfd645465b542371"
]

const mockInstanceDiff: ShiftOccurrence = {
    shiftId: 'mock-id-1---2023-04-21',
    id: 'mock-id-1',
    chat: null,
    title: 'Special Water Distribution',
    positions: [
        {
            id: 'pos-id-1',
            attributes: [],
            role: DefaultRoleIds.Anyone,
            min: 1,
            max: 1,
            joinedUsers: [userIds[0]]
        },
        {
            id: 'pos-id-2',
            attributes: [],
            role: DefaultRoleIds.Dispatcher,
            min: 1,
            max: 1,
            joinedUsers: [userIds[4]]
        },
        {
            id: 'pos-id-2',
            attributes: [],
            role: DefaultRoleIds.Responder,
            min: 2,
            max: 2,
            joinedUsers: [userIds[5], userIds[2]]
        }
    ],
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
    startDate: new Date(moment().hour(22).minutes(0).toDate()), // Today @ 10:05pm 
    endDate: new Date(moment().hour(22).minutes(0).add(2, 'hours').toDate()), // Tomorrow @ 12:05am 
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
        ['2023-04-21']: mockInstanceDiff
    },
    positions: [],
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
                const occurrenceId = this.composeShiftOccurrenceId(shift.id, occurrence.date);
                const shiftOccurrence: ShiftOccurrence = this.getShiftOccurrence(occurrenceId);
                const satisfiesRolesFilter = this.filter.rolesFilter == ShiftsRolesFilter.All
                                                || this.shiftOccurrenceHasUserRoles(userStore().user.id, shiftOccurrence);
                const satisfiesNeedsPeopleFilter = this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.All
                                                    || (this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.Unfilled
                                                        && this.getShiftOccurrencePositionStatus(shiftOccurrence) != PositionStatus.MinSatisfied);
                if (satisfiesNeedsPeopleFilter && satisfiesRolesFilter) {
                    filteredOccurrences.push(this.getShiftOccurrence(occurrenceId))
                }
            })
        });

        filteredOccurrences.sort(function(occurrenceA, occurrenceB) {
            return new Date(occurrenceA.dateTimeRange.startDate).valueOf() - new Date(occurrenceB.dateTimeRange.startDate).valueOf();
        });

        return filteredOccurrences;
    }

    shiftOccurrenceHasUserRoles(userId: string, shiftOccurrence: ShiftOccurrence): boolean {
        // TODO: How to treat a shift with no roles defined?
        const userRoleIds = organizationStore().userRoles.get(userId).map(role => role.id);
        const filteredArray = shiftOccurrence.positions.map(p => p.role).filter(roleId => userRoleIds.includes(roleId));
        return filteredArray.length > 0;
    }

    patchRecurrenceToRRule(shiftId: string, recurringDateTime: RecurringDateTimeRange): Rule {
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
        console.log(`setNeedsPeopleFilter: ${needsPeopleFilter}`);
        this.filter.needsPeopleFilter = needsPeopleFilter;
        await this.getShifts();
    }

    setRolesFilter = async (rolesFilter: ShiftsRolesFilter): Promise<void> => {
        this.filter.rolesFilter = rolesFilter;
        await this.getShifts();
    }

    setDateRange = async (dateRange: DateTimeRange): Promise<void> => {
        this.dateRange = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        }
    }

    decomposeShiftOccurrenceId(shiftOccurrenceId: string): string[] {
        // Split a shift occurrence id into its parent ID and date representation
        return shiftOccurrenceId.split('---');
    }

    composeShiftOccurrenceId(shiftId: string, date: Date): string {
        // Shift Occurrence Id consists of the parent shift ID concatenated
        // with the ISO date string of the day of the occurrence.
        // const [dateStr] = date.toISOString().split('T');
        const dateStr = moment(new Date(date)).format('YYYY-MM-DD');
        //console.log(`Compose Shift Id: ${date} ***** ${date.toISOString()}`)
        return `${shiftId}---${dateStr}`;
    }

    getShiftOccurrenceDateTime(shift: Shift, occurrenceDateStr: string): DateTimeRange {
        // Given a shift and an ISO string representing the date of an occurrence,
        // generate the date time range object that defines the duration of this occurrence.
        const shiftDuration = shift.recurrence.endDate.valueOf() - shift.recurrence.startDate.valueOf();
        const startDate = moment(occurrenceDateStr).set({'hour': shift.recurrence.startDate.getHours(), 'minute': shift.recurrence.startDate.getMinutes()}).toDate();
        const endDate = moment(startDate).add(shiftDuration, 'milliseconds').toDate();

        // console.log(`Shift occurrence date: ${startDate} and string: ${occurrenceDateStr}`)
        return {
            startDate: startDate,
            endDate: endDate
        }
    }

    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence {
        const [shiftId, occurrenceDateStr] = this.decomposeShiftOccurrenceId(shiftOccurrenceId);
        const shift = this.shifts.get(shiftId);
        const diff = occurrenceDateStr in shift.occurrenceDiffs
                            ? shift.occurrenceDiffs[occurrenceDateStr]
                            : null;
        return {
            id: shiftOccurrenceId,
            shiftId: shift.id,
            // TODO
            chat: {
                id: '',
                messages: [],
                lastMessageId: 0,
                userReceipts: {}
            },
            // Get values from diff if they exist
            dateTimeRange: diff?.dateTimeRange
                            ? diff.dateTimeRange
                            : this.getShiftOccurrenceDateTime(shift, occurrenceDateStr),
            title: diff?.title ? diff.title : shift.title,
            description: diff?.description ? diff.description : shift.description,
            positions: diff?.positions != null
                        ? JSON.parse(JSON.stringify(diff.positions))
                        : JSON.parse(JSON.stringify(shift.positions))
        };
    }

    getShiftOccurrencePositionStatus(shiftOccurrence: ShiftOccurrence): PositionStatus {
        const positionNeedsPeople = (position: Position) => position.joinedUsers.length < position.min;
        const shiftNeedsPeople = (s: ShiftOccurrence) => s.positions.some(positionNeedsPeople);
        return shiftNeedsPeople(shiftOccurrence)
                ? PositionStatus.MinUnSatisfied
                : PositionStatus.MinSatisfied;
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