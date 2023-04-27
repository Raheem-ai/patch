import { autorun, makeAutoObservable, ObservableMap, ObservableSet, reaction, runInAction, set, when } from 'mobx';
import { Store } from './meta';
import { IRequestStore, IShiftStore, IUserStore, manageAttributesStore, organizationStore, PositionScopedMetadata, RequestMetadata, RequestScopedMetadata, userStore } from './interfaces';
import { ClientSideFormat, OrgContext, RequestContext } from '../../../common/api';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftNeedsPeopleFilter, CategorizedItem, DefaultRoleIds, HelpRequest, HelpRequestFilter, HelpRequestSortBy, PatchEventType, PatchPermissions, Position, ProtectedUser, RequestStatus, RequestTeamEvent, RequestTeamEventTypes, ResponderRequestStatuses, Role, Shift, RecurringDateTimeRange, RecurringPeriod, ShiftOccurrence, PositionStatus, DateTimeRange, ShiftStatus, ShiftOccurrenceMetadata } from '../../../common/models';
import { api } from '../services/interfaces';
import { persistent, securelyPersistent } from '../meta';
import { userHasAllPermissions } from '../utils';
import { positionStats } from '../../../common/utils/requestUtils';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';
import moment from 'moment';
import { DateAdapter, DateTime, IRuleOptions, OccurrenceGenerator, OccurrenceIterator, Rule, RuleOption, RuleOptionError, Schedule, StandardDateAdapter } from '../utils/rschedule'
import * as uuid from 'uuid';

// Mock data for testing and debugging purposes.
// Will be removed as feature progresses.
// User Ids in Patch org for test purposes
const userIds = [
    "62da9696bfd645465b54236d",
    "62da9696bfd645465b54236f",
    "62da9696bfd645465b542373",
    "62da9695bfd645465b542366",
    "63e2f010c9c2a1001fed363d",
    "62da9696bfd645465b542371"
]

// Mock shift occurrence diff
const mockInstanceDiff: ShiftOccurrence = {
    shiftId: 'mock-id-1---2023-05-05',
    id: 'mock-id-1',
    chat: null,
    title: 'Special Water Distribution',
    positions: [
        {
            id: 'pos-id-1',
            attributes: [],
            role: DefaultRoleIds.Anyone,
            min: 2,
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

// Shift recurrence definition
const recurrence: RecurringDateTimeRange = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 1,
        days: [1,3,5]
    },
    until: {
        repititions: 30,
        date: null
    },
    startDate: new Date(moment().hour(12).minutes(0).subtract(2, 'weeks').toDate()),
    endDate: new Date(moment().hour(12).minutes(0).subtract(2, 'weeks').add(2, 'hours').toDate()),
};

// Mock shift definition
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
        ['2023-05-05']: mockInstanceDiff
    },
    positions: [
        {
            id: 'pos-id-1',
            attributes: [],
            role: DefaultRoleIds.Anyone,
            min: 1,
            max: 1,
            joinedUsers: []
        },
        {
            id: 'pos-id-2',
            attributes: [],
            role: DefaultRoleIds.Dispatcher,
            min: 1,
            max: 1,
            joinedUsers: []
        },
        {
            id: 'pos-id-2',
            attributes: [],
            role: DefaultRoleIds.Responder,
            min: 2,
            max: 2,
            joinedUsers: []
        }
    ],
}

// Second shift recurrence definition
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
    endDate: new Date(moment().hour(22).minutes(0).add(2, 'hours').toDate()), // Tomorrow @ 12:05am 
};

// Second mock shift definition
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

    // Filter which shift occurrences to retrieve
    filter: ShiftsFilter = {
        daysFilter: CalendarDaysFilter.All,
        needsPeopleFilter: ShiftNeedsPeopleFilter.All,
        rolesFilter: ShiftsRolesFilter.All
    };

    // Date range window to retrieve shift occurrences
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

    get filteredShiftOccurenceMetadata(): ShiftOccurrenceMetadata[] {
        const filteredMetadata: ShiftOccurrenceMetadata[] = [];

        const shiftsMap: { [date: string]: ShiftOccurrence[]} = {};

        // If we don't have a valid date range, return immediately with an empty list.
        if (this.dateRange.startDate == null || this.dateRange.endDate == null) {
            return filteredMetadata;
        }

        this.shiftsArray.forEach(shift => {
            const rule = this.patchRecurrenceToRRule(shift.id, shift.recurrence);

            if (rule == null) {
                return;
            }

            const shiftSchedule = new Schedule({
                rrules: [rule]
            });

            shiftSchedule.occurrences({ start: this.dateRange.startDate, end: this.dateRange.endDate }).toArray().forEach(occurrence => {
                // Compose id from parent shift id and occurrence date (works because no shift has multiple occurrences starting on the same day)
                const occurrenceId = this.composeShiftOccurrenceId(shift.id, occurrence.date);

                // Helper function retrieves and builds up the shift occurrence object for this date.
                const shiftOccurrence: ShiftOccurrence = this.getShiftOccurrence(occurrenceId);

                // Verify it satisfies the filter conditions before pushing to our array.
                const satisfiesRolesFilter = this.filter.rolesFilter == ShiftsRolesFilter.All
                                                || this.userHasShiftRoles(userStore().user.id, shiftOccurrence);
                const satisfiesNeedsPeopleFilter = this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.All
                                                    || (this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.Unfilled
                                                        && this.getShiftStatus(shiftOccurrence) != ShiftStatus.Satisfied);

                if (satisfiesNeedsPeopleFilter && satisfiesRolesFilter) {
                    const dateStr = moment(new Date(occurrence.date)).format('YYYY-MM-DD');
                    if (!shiftsMap[dateStr]) {
                        shiftsMap[dateStr] = []
                    }

                    shiftsMap[dateStr].push(shiftOccurrence);    
                }
            })
        });

        const iterDate = new Date(this.dateRange.startDate);
        while (iterDate <= this.dateRange.endDate) {
            const dateStr = moment(new Date(iterDate)).format('YYYY-MM-DD');
            const dateShifts = shiftsMap[dateStr] ? shiftsMap[dateStr] : [];
            let addMetadata = this.filter.daysFilter == CalendarDaysFilter.All
                                || (this.filter.daysFilter == CalendarDaysFilter.WithShifts && dateShifts.length > 0)
                                || (this.filter.daysFilter == CalendarDaysFilter.WithoutShifts && dateShifts.length == 0);

            if (addMetadata) {
                // Since we've sequentially added shifts from potentially many different shift definitions, we need to do a final sort by date.
                dateShifts.sort(function(occurrenceA, occurrenceB) {
                    return new Date(occurrenceA.dateTimeRange.startDate).valueOf() - new Date(occurrenceB.dateTimeRange.startDate).valueOf();
                });

                filteredMetadata.push({
                    date: new Date(iterDate),
                    occurrences: dateShifts
                })
            }

            // Move forward one date
            iterDate.setDate(iterDate.getDate() + 1);
        }

        return filteredMetadata;
    }

    userHasShiftRoles(userId: string, shiftOccurrence: ShiftOccurrence): boolean {
        // If a shift has no positions, return true immediately
        if (shiftOccurrence.positions.length == 0) {
            return true;
        }

        // Get the role Ids assigned to this user
        const userRoleIds = organizationStore().userRoles.get(userId).map(role => role.id);

        // Get the intersection of the user's roles and all of the roles specified by the shift's positions
        const filteredArray = shiftOccurrence.positions.map(p => p.role).filter(roleId => userRoleIds.includes(roleId));

        // If there are any items in the filtered array then there is at least one position on this
        // shift that the user is qualified to join.
        // TODO: Should we also ensure that the position that the user is qualified for is not
        // already full? (i.e. has the max number of joined users already)
        return filteredArray.length > 0;
    }

    patchRecurrenceToRRule(shiftId: string, recurringDateTime: RecurringDateTimeRange): Rule {
        // Given a PATCH definition of a recurrence, generate an rschedule Rule that can be used
        // to project the date time schedule for the provided shift (id).

        // Map a RecurringPeriod value to the proper rschedule frequency string
        const frequencyMap: { [key in RecurringPeriod]: RuleOption.Frequency } = {
            [RecurringPeriod.Month]: 'MONTHLY',
            [RecurringPeriod.Week]: 'WEEKLY',
            [RecurringPeriod.Day]: 'DAILY'
        }

        // Specify the options for the rule we're creating
        const ruleOptions: IRuleOptions = {
            start: new Date(recurringDateTime.startDate),
            duration: recurringDateTime.endDate.getTime() - recurringDateTime.startDate.getTime(),
            frequency: recurringDateTime.every?.period
                        ? frequencyMap[recurringDateTime.every.period]
                        : frequencyMap[RecurringPeriod.Day],
            // From rschedule documentation: "The WKST rule part specifies the day on which the workweek starts"
            // For PATCH, the calendar/workweek starts on Sunday (0).
            weekStart: DateAdapter.WEEKDAYS[0]
        }

        // 
        if (recurringDateTime.every) {
            ruleOptions.interval = recurringDateTime.every.numberOf;
        }

        if (recurringDateTime.until) {
            if (recurringDateTime.until.date) {
                // If the shift has a specified end date, we supply it here.
                ruleOptions.end = new Date(recurringDateTime.until.date);
            } else if (recurringDateTime.until.repititions) {
                // If the rule instead specifies the number of repitions before
                // a recurrence ends, we specify it using the count option.
                ruleOptions.count = recurringDateTime.until.repititions;
            }
        }

        // If the entire RecurringTimeConstraints portion of the recurrence is null,
        // this is a shift that occurs only once.
        if (recurringDateTime.until == null && recurringDateTime.every == null) {
            ruleOptions.count = 1;
        }

        // If the recurrence is monthly, specify which day of the month or which week number and day the repitition exists on.
        if (recurringDateTime.every?.period == RecurringPeriod.Month) {
            if (recurringDateTime.every.dayScope) {
                ruleOptions.byDayOfMonth = [recurringDateTime.startDate.getDate() as RuleOption.ByDayOfMonth];
            } else if (recurringDateTime.every.weekScope) {
                // TODO: not implemented in input control yet. Will return to implementation after fixing.
            }
        }

        // If the occurrence is weekly, specify which weekdays here.
        if (recurringDateTime.every?.period == RecurringPeriod.Week) {
            if (recurringDateTime.every.days.length == 0) {
                return null;
            }
            ruleOptions.byDayOfWeek = recurringDateTime.every.days.map(x => DateAdapter.WEEKDAYS[x]);
        }

        // Create and return the rule with the options we've just built up.
        return new Rule(ruleOptions, { data: { shiftId: shiftId }});
    }

    setFilter = async (filter: ShiftsFilter): Promise<void> => {
        this.filter = filter;
    }

    setDaysFilter = async (daysFilter: CalendarDaysFilter): Promise<void> => {
        this.filter.daysFilter = daysFilter;
    }

    setNeedsPeopleFilter = async (needsPeopleFilter: ShiftNeedsPeopleFilter): Promise<void> => {
        this.filter.needsPeopleFilter = needsPeopleFilter;
    }

    setRolesFilter = async (rolesFilter: ShiftsRolesFilter): Promise<void> => {
        this.filter.rolesFilter = rolesFilter;
    }

    addFutureWeekToDateRange = async (): Promise<void> => {
        const newEndDate = new Date(this.dateRange.endDate);
        newEndDate.setDate(newEndDate.getDate() + 7);
        this.dateRange = {
            startDate: this.dateRange.startDate,
            endDate: newEndDate
        }
    }

    addPreviousWeekToDateRange = async (): Promise<void> => {
        const newStartDate = new Date(this.dateRange.startDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        this.dateRange = {
            startDate: newStartDate,
            endDate: this.dateRange.endDate
        }
    }

    setDateRange = async (dateRange: DateTimeRange): Promise<void> => {
        this.dateRange = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        }
    }

    decomposeShiftOccurrenceId(shiftOccurrenceId: string): string[] {
        // Split a shift occurrence id into its parent ID and date components.
        return shiftOccurrenceId.split('---');
    }

    composeShiftOccurrenceId(shiftId: string, date: Date): string {
        // Shift Occurrence Id consists of the parent shift ID concatenated
        // with the ISO date formatted string of the day of the occurrence.
        const dateStr = moment(new Date(date)).format('YYYY-MM-DD');
        return `${shiftId}---${dateStr}`;
    }

    getShiftOccurrenceDateTime(shift: Shift, occurrenceDateStr: string): DateTimeRange {
        // Given a shift and an ISO string representing the date of an occurrence,
        // generate the date time range object that defines this specific occurrence.
        const shiftDuration = shift.recurrence.endDate.valueOf() - shift.recurrence.startDate.valueOf();
        const startDate = moment(occurrenceDateStr).set({'hour': shift.recurrence.startDate.getHours(), 'minute': shift.recurrence.startDate.getMinutes()}).toDate();
        const endDate = moment(startDate).add(shiftDuration, 'milliseconds').toDate();

        return {
            startDate: startDate,
            endDate: endDate
        }
    }

    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence {
        // Given a shift occurrence id, return the object containing details of the occurrence.
        const [shiftId, occurrenceDateStr] = this.decomposeShiftOccurrenceId(shiftOccurrenceId);

        // Get the parent shift
        const shift = this.shifts.get(shiftId);

        // Check if a diff of the shift exists for this date's occurrence
        const diff = shift.occurrenceDiffs[occurrenceDateStr];

        // Compose the final shift occurrence object from a mix of the parent
        // shift details and the diff details if one exists.
        return {
            id: shiftOccurrenceId,
            shiftId: shift.id,
            // Get values from diff if they exist
            chat: diff?.chat 
                    ? diff.chat
                    : {
                        id: uuid.v1(),
                        messages: [],
                        lastMessageId: 0,
                        userReceipts: {}
                    },
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

    getShiftStatus(shiftOccurrence: ShiftOccurrence): ShiftStatus {
        if (shiftOccurrence.positions?.length > 0) {
            const stats = positionStats(shiftOccurrence.positions, userStore().usersRemovedFromOrg.map(u => u.id));
            return !stats.totalMinFilled 
                    ? ShiftStatus.Empty
                    : stats.totalMinToFill > stats.totalMinFilled 
                        ? ShiftStatus.PartiallySatisfied
                        : ShiftStatus.Satisfied;
        }

        return ShiftStatus.Satisfied;
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