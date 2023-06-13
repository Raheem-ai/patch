import { makeAutoObservable, ObservableMap, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IShiftStore, organizationStore, userStore } from './interfaces';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftNeedsPeopleFilter, DefaultRoleIds, Shift, RecurringDateTimeRange, RecurringPeriod, ShiftOccurrence, DateTimeRange, ShiftStatus, ShiftOccurrenceMetadata, WithoutDates, ShiftOccurrenceDiff } from '../../../common/models';
import { positionStats } from '../../../common/utils/requestUtils';
import moment from 'moment';
import { DateAdapter, IRuleOptions, Rule, RuleOption, Schedule } from '../utils/rschedule'
import * as uuid from 'uuid';
import { persistent, securelyPersistent } from '../meta';
import { api } from '../services/interfaces';
import { OrgContext } from '../../../common/api';

@Store(IShiftStore)
export default class ShiftStore implements IShiftStore {
    @persistent() currentShiftOccurrenceId: string = null;
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
    }) _shifts: ObservableMap<string, WithoutDates<Shift>> = new ObservableMap();

    // Date range window to retrieve shift occurrences
    dateRange: { startDate: Date, endDate: Date } = {
        startDate: null,
        endDate: null
    }

    scrollToDate: Date = null;
    initialScrollFinished = false;

    get shifts(): ObservableMap<string, Shift> {
        
        const resolvedShifts = Array.from(this._shifts.entries()).map(entry => {
            return [entry[0], this.fromShiftWithoutDates(entry[1])] as [string, Shift]
        });

        return new ObservableMap<string, Shift>(resolvedShifts);
    }

    fromShiftWithoutDates(shift: WithoutDates<Shift>): Shift {
        const copy = JSON.parse(JSON.stringify(shift));
        return {
            createdAt: copy.createdAt,
            updatedAt: copy.updatedAt,
            id: copy.id,
            displayId: copy.displayId,
            orgId: copy.orgId,
            title: copy.title,
            description: copy.description,
            positions: copy.positions,
            recurrence: this.fromRecurrenceWithoutDates(copy.recurrence),
            occurrenceDiffs: this.fromOccurrenceDiffsWithoutDates(copy.occurrenceDiffs)
        }
    }

    fromRecurrenceWithoutDates(recurrence: WithoutDates<RecurringDateTimeRange>): RecurringDateTimeRange {
        const recurrenceWithDates =  {
            startDate: new Date(recurrence.startDate),
            endDate: new Date(recurrence.endDate),
            startTime: new Date(recurrence.startTime),
            endTime: new Date(recurrence.endTime),
            every: recurrence.every,
            until: recurrence.until
                ? {
                    date: recurrence.until.date
                        ? new Date(recurrence.until.date)
                        : null,
                    repititions: recurrence.until.repititions
                        ? recurrence.until.repititions
                        : null
                }
                : null
        }

        return recurrenceWithDates as RecurringDateTimeRange;
    }

    fromOccurrenceDiffsWithoutDates(diffs: { [occurenceId: string]: ShiftOccurrence}): { [occurenceId: string]: ShiftOccurrence} {
        const diffsWithDates = {}
        if (diffs) {
            for (const [key, value] of Object.entries(diffs)) {
                diffsWithDates[key] = value;
            }
        }
        return diffsWithDates;
    }

    // Filter which shift occurrences to retrieve
    filter: ShiftsFilter = {
        daysFilter: CalendarDaysFilter.All,
        needsPeopleFilter: ShiftNeedsPeopleFilter.All,
        rolesFilter: ShiftsRolesFilter.All
    };

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

    get currentShiftOccurrence(): ShiftOccurrence {
        return this.currentShiftOccurrenceId
            ? this.getShiftOccurrence(this.currentShiftOccurrenceId)
            : null;
    }

    get shiftsArray() {
        return Array.from(this.shifts.values());
    }

    get filteredShiftOccurenceMetadata(): ShiftOccurrenceMetadata[] {
        // The final collection of dates and associated shift data that
        // is returned for a the calendar component to display.
        const filteredMetadata: ShiftOccurrenceMetadata[] = [];

        // As we iterate through each shift, we store the collections by
        // date in YYYY-MM-DD format. So when we iterate through the date
        // range (this.dateRange) to populate the final filteredMetadata,
        // we can index into this object for each date in our range.
        const shiftsMap: { [date: string]: ShiftOccurrence[]} = {};

        // If we don't have a valid date range, return immediately with an empty list.
        if (this.dateRange.startDate == null || this.dateRange.endDate == null) {
            return filteredMetadata;
        }

        // For each shift that we have a definition for, collect the occurrences within
        // the specified date range that satisfy the filter criteria.
        this.shiftsArray.forEach(shift => {
            // Generate an rSchedule rule object, to generate the shifts schedule.
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
                    // Add the occurrence to the collection of occurrences on this date.
                    const dateStr = moment(new Date(occurrence.date)).format('YYYY-MM-DD');
                    if (!shiftsMap[dateStr]) {
                        shiftsMap[dateStr] = []
                    }

                    shiftsMap[dateStr].push(shiftOccurrence);    
                }
            })

            // TODO: Add detached occurrences for this shift
        });

        // Iterate through each day in our specified date range.
        // For each date, get the occurrences that occur on that date.
        // Determine if the date and associated shifts should be returned
        // for display based on the filter.
        const iterDate = new Date(this.dateRange.startDate);

        const now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
        let foundFirstDate = false;
        while (iterDate <= this.dateRange.endDate) {
            const dateStr = moment(new Date(iterDate)).format('YYYY-MM-DD');
            const dateShifts = shiftsMap[dateStr] ? shiftsMap[dateStr] : [];
            let addMetadata = this.filter.daysFilter == CalendarDaysFilter.All
                                || (this.filter.daysFilter == CalendarDaysFilter.WithShifts && dateShifts.length > 0)
                                || (this.filter.daysFilter == CalendarDaysFilter.WithoutShifts && dateShifts.length == 0);

            if (addMetadata) {
                // Since we've sequentially added shifts from potentially many different shift definitions, we need to do a final sort by start date and times.
                dateShifts.sort(function(occurrenceA, occurrenceB) {
                    // TODO: Move to helper
                    const startTimeA = moment(occurrenceA.dateTimeRange.startDate)
                                        .hours(occurrenceA.dateTimeRange.startTime.getHours())
                                        .minutes(occurrenceA.dateTimeRange.startTime.getMinutes())
                                        .toDate();
                    const startTimeB = moment(occurrenceB.dateTimeRange.startDate)
                                        .hours(occurrenceB.dateTimeRange.startTime.getHours())
                                        .minutes(occurrenceB.dateTimeRange.startTime.getMinutes())
                                        .toDate();

                    const endTimeA = moment(occurrenceA.dateTimeRange.endDate)
                                        .hours(occurrenceA.dateTimeRange.endTime.getHours())
                                        .minutes(occurrenceA.dateTimeRange.endTime.getMinutes())
                                        .toDate();
                    const endTimeB = moment(occurrenceB.dateTimeRange.endDate)
                                        .hours(occurrenceB.dateTimeRange.endTime.getHours())
                                        .minutes(occurrenceB.dateTimeRange.endTime.getMinutes())
                                        .toDate();
                    return startTimeA.getTime() - startTimeB.getTime() || endTimeA.getTime() - endTimeB.getTime();
                });

                let scrollTo = false;
                // When the calendar view is loading, we do an intial scroll to today's date
                // or the first date that appears after today. Otherwise, check if we have a 
                // specified date to scroll to.
                if (!this.initialScrollFinished && !foundFirstDate && moment(iterDate).isSameOrAfter(now)) {
                    scrollTo = true;
                    foundFirstDate = true;
                } else if (this.scrollToDate && moment(iterDate).isSame(this.scrollToDate)) {
                    scrollTo = true;
                }

                filteredMetadata.push({
                    date: new Date(iterDate),
                    occurrences: dateShifts,
                    scrollTo: scrollTo
                })
            }

            // Move forward one day
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

        const shiftDuration = recurringDateTime.endTime.getTime() - recurringDateTime.startTime.getTime();
        if (shiftDuration <= 0) {
            return null;
        }

        // Specify the options for the rule we're creating
        const ruleOptions: IRuleOptions = {
            start: moment(new Date(recurringDateTime.startDate))
                    .hours(recurringDateTime.startTime.getHours())
                    .minutes(recurringDateTime.startTime.getMinutes())
                    .toDate(),
            duration: shiftDuration,
            frequency: recurringDateTime.every?.period
                        ? frequencyMap[recurringDateTime.every.period]
                        : frequencyMap[RecurringPeriod.Day],
            // From rschedule documentation: "The WKST rule part specifies the day on which the workweek starts"
            // For PATCH, the calendar/workweek starts on Sunday (0).
            weekStart: DateAdapter.WEEKDAYS[0]
        }

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
        this.scrollToDate = null;
        const newEndDate = new Date(this.dateRange.endDate);
        newEndDate.setDate(newEndDate.getDate() + 7);
        this.dateRange = {
            startDate: this.dateRange.startDate,
            endDate: newEndDate
        }
    }

    addPreviousWeekToDateRange = async (): Promise<void> => {
        // When we fetch dates in the past, we don't want the calendar
        // list view to scroll all the way to the furthest date in the past.
        // It should remain focused on the date the user is currently viewing,
        // which should be the current date range's start date.
        this.scrollToDate = this.dateRange.startDate;
        const newStartDate = new Date(this.dateRange.startDate);
        newStartDate.setDate(newStartDate.getDate() - 7);
        this.dateRange = {
            startDate: newStartDate,
            endDate: this.dateRange.endDate
        }
    }

    initializeDateRange = async (dateRange: DateTimeRange): Promise<void> => {
        this.dateRange = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        }

        this.scrollToDate = null;
        this.initialScrollFinished = false;
    }

    decomposeShiftOccurrenceId(shiftOccurrenceId: string): string[] {
        if (!shiftOccurrenceId) {
            return null;
        }

        // Split a shift occurrence id into its parent ID and date components.
        return shiftOccurrenceId.split('---');
    }

    getShiftIdFromShiftOccurrenceId(shiftOccurrenceId: string): string {
        // Return just the parent shift id from a shift occurrence id
        return shiftOccurrenceId.split('---')[0];
    }

    composeShiftOccurrenceId(shiftId: string, date: Date): string {
        // Shift Occurrence Id consists of the parent shift ID concatenated
        // with the ISO date formatted string of the day of the occurrence.
        const dateStr = moment(new Date(date)).format('YYYY-MM-DD');
        return `${shiftId}---${dateStr}`;
    }

    getShiftOccurrenceDateTime(shift: Shift, diff: ShiftOccurrenceDiff, occurrenceDateStr: string): DateTimeRange {
        // Given a shift and an ISO string representing the date of an occurrence,
        // generate the date time range object that defines this specific occurrence.

        // The shift start/end time and duration is determined by the shift definition recurrence OR a diff value
        const startTime = diff?.dateTimeRange?.startTime ? diff.dateTimeRange.startTime : shift.recurrence.startTime;
        const endTime = diff?.dateTimeRange?.endTime ? diff.dateTimeRange.endTime : shift.recurrence.endTime;

        // Start date has to be retrieved from the diff OR the occurrence date string portion of its id
        // Get the time between the shift definition's start and end date to calculate the shift's default end date if necessary.
        const dateDiffDuration = shift.recurrence.endDate.getTime() - shift.recurrence.startDate.getTime();
        const startDate = diff?.dateTimeRange?.startDate ? diff.dateTimeRange.startDate : moment(occurrenceDateStr).hours(0).minutes(0).toDate();
        const endDate = diff?.dateTimeRange?.endDate
                        ? diff.dateTimeRange.endDate
                        : moment(startDate).add(dateDiffDuration, 'milliseconds').toDate();

        return {
            startDate: startDate,
            startTime: startTime,
            endDate: endDate,
            endTime: endTime
        }
    }

    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence {
        // Given a shift occurrence id, return the object containing details of the occurrence.
        const [shiftId, occurrenceDateStr] = this.decomposeShiftOccurrenceId(shiftOccurrenceId);

        // Get the parent shift
        const shift = this.shifts.get(shiftId);

        // TODO: Handle case where shift not found?
        if (!shift) {
            return null;
        }

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
            dateTimeRange: this.getShiftOccurrenceDateTime(shift, diff, occurrenceDateStr),
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
        try {
            const oldCurrentShiftId = this.currentShiftOccurrenceId;
            const shifts = await api().getShifts(this.orgContext(), shiftIds);

            runInAction(() => {
                shifts.forEach(s => this.updateOrAddShift(s));
                if (oldCurrentShiftId) {
                    const possibleUpdatedCurrentShift = this.getShiftOccurrence(oldCurrentShiftId);
                    this.setCurrentShiftOccurrence(possibleUpdatedCurrentShift);
                }
            })
        } catch (e) {
            console.error(e);
        }
    }

    async getShift(shiftId: string): Promise<void> {
        const shift = await api().getShift(this.orgContext(), shiftId);

        // TODO: what to do if not found?
        if (shift) {
            runInAction(() => {
                this.updateOrAddShift(shift);
            })
        }
    }

    setCurrentShiftOccurrence(shiftOccurrence: ShiftOccurrence): void {
        // Clear the current shift occurrence ID if the given occurrence is null
        if (!shiftOccurrence) {
            this.currentShiftOccurrenceId = null;
            return;
        }

        // Otherwise update the shift store's currend ID
        runInAction(() => {
            this.currentShiftOccurrenceId = shiftOccurrence.id;
        })
    }

    updateOrAddShift(updatedShift: WithoutDates<Shift>) {
        this._shifts.merge({
            [updatedShift.id]: updatedShift
        })
    }

    getShiftsAfterSignin = async () => {
        await this.getShifts([]);

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getShiftsAfterSignin)
        })
    }

    orgContext(orgId?: string): OrgContext {
        return {
            token: userStore().authToken,
            orgId: orgId || userStore().currentOrgId
        }
    }

    clear(): void {
        this._shifts.clear();
        this.currentShiftOccurrenceId = null;
        this.dateRange = {
            startDate: null,
            endDate: null
        };
        this.scrollToDate = null;
    }
}