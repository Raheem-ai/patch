import { makeAutoObservable, ObservableMap, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IShiftStore, organizationStore, userStore } from './interfaces';
import { CalendarDaysFilter, ShiftsFilter, ShiftsRolesFilter, ShiftNeedsPeopleFilter, DefaultRoleIds, Shift, RecurringDateTimeRange, RecurringPeriod, ShiftOccurrence, DateTimeRange, ShiftStatus, ShiftOccurrenceMetadata, WithoutDates, ShiftOccurrenceDiff, ShiftSeries, DateWindow } from '../../../common/models';
import { positionStats } from '../../../common/utils/requestUtils';
import moment from 'moment';
import { DateAdapter, IRuleOptions, Rule, RuleOption, Schedule } from '../utils/rschedule'
import * as uuid from 'uuid';
import { persistent, securelyPersistent } from '../meta';
import { api } from '../services/interfaces';
import { OrgContext } from '../../../common/api';
import { getShiftOccurrenceIdFromParts, getPartsFromShiftOccurrenceId, getShiftSeriesFromOccurrenceDateTime, resolveFullDateTime, formatShiftOccurrenceDateForId } from '../../../common/utils/shiftUtils';

@Store(IShiftStore)
export default class ShiftStore implements IShiftStore {
    // This value is non-null when a user navigates to a view or form for
    // a specific shift occurrence (e.g. shift occurrence details, edit shift form, etc.)
    @persistent() currentShiftOccurrenceId: string = null;

    // The private _shifts variable is a map from shift id string to the db
    // representation of a shift (WithoutDates)
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

    // The shift store maintains a date range window, to limit the amount of shift and
    // shift occurrence metadata sent to the views that are requesting shifts. This date range
    // window can change as a user scrolls the shift list view, moving the start date earlier or 
    // pushing the end date further into the future.
    // NOTE: The view components must initialize this value using the initializeDateRange method below.
    dateRange: DateWindow = {
        startDate: null,
        endDate: null
    }

    // The ShiftOccurrenceMetadata object that represents all of the shift occurrences that
    // occur on a single date (for the convenience of the calendar), has a scrollTo flag that
    // indicates whether this date should automatically be scrolled to by the app either when
    // the date range window expands or the shifts are being retrieved for the first time.
    // When shifts are loaded for the first time we want to scroll the user to today's date, initially.
    // When a user scrolls the calendar list view into the past, we don't want the app to automatically
    // jump to the earliest date in the list. So before expanding the date window, we set the scrollToDate
    // to the current earliest date in the date window (if a user triggers an expansion of the date window futher
    // into the past, they must be approaching or already at the earliest date in our current window) so that the
    // view doesn't jump and instead stays on the date they're already viewing while also retrieving more shifts in the past.
    scrollToDate: Date = null;

    // We use this flag to determine if this is the first time the shift store is retrieving shift metadata to initialize the
    // calendar view. In this case we want to scroll to the current date. After the initial scroll is finished, we let the
    // scrollToDate determine if and where the calendar should be auto-scrolled to.
    initialScrollFinished = false;

    // This is the publicly available getter that most of the app should use when retrieving shifts from
    // the shift store. It's a wrapper around the internal _shifts property that converts the db
    // representation of a shift (WithoutDates<Shift>) to a standard Shift with dates that the frontend needs.
    get shifts(): ObservableMap<string, Shift> {
        const resolvedShifts = Array.from(this._shifts.entries()).map(entry => {
            return [entry[0], this.fromShiftWithoutDates(entry[1])] as [string, Shift]
        });

        return new ObservableMap<string, Shift>(resolvedShifts);
    }

    // Convert a WithoutDates<Shift> to a Shift. In the backend,
    // dates are represented as strings, so we convert all date properties
    // (including nested) on hte object to proper javascript Dates here.
    fromShiftWithoutDates(shift: WithoutDates<Shift>): Shift {
        const copy = JSON.parse(JSON.stringify(shift));

        // Create the shift series list with dates resolved
        const shiftSeries: ShiftSeries[] = copy.series.map(series => {
            return this.fromShiftSeriesWithoutDates(series);
        })

        const shiftWithDates: Shift = {
            createdAt: copy.createdAt,
            updatedAt: copy.updatedAt,
            id: copy.id,
            orgId: copy.orgId,
            series: shiftSeries
        }

        return shiftWithDates;
    }

    fromShiftSeriesWithoutDates(series: WithoutDates<ShiftSeries>): ShiftSeries {
        const seriesCopy = JSON.parse(JSON.stringify(series)) as WithoutDates<ShiftSeries>;
        return {
            id: seriesCopy.id,
            title: seriesCopy.title,
            description: seriesCopy.description,
            positions: seriesCopy.positions,
            deletedOccurrenceIds: seriesCopy.deletedOccurrenceIds,

            // Properties that need to be resolved
            startDate: new Date(seriesCopy.startDate),
            recurrence: this.fromRecurrenceWithoutDates(seriesCopy.recurrence),
            projectedDiffs: this.fromOccurrenceDiffsWithoutDates(seriesCopy.projectedDiffs),
            detachedDiffs: this.fromOccurrenceDiffsWithoutDates(seriesCopy.detachedDiffs)
        }
    }

    // Given a single shift recurrence, convet the string representation of dates to Javascript Date
    // objects.
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

    fromOccurrenceDiffsWithoutDates(diffs: { [occurenceId: string]: WithoutDates<ShiftOccurrenceDiff>}): { [occurenceId: string]: ShiftOccurrenceDiff} {
        const diffsWithDates = {}
        if (diffs) {
            for (const [key, value] of Object.entries(diffs)) {
                // Initialize the value for this diff with an empty object,
                // that we will populate with the correct values for each prop below.
                diffsWithDates[key] = {};
                for (const prop in value) {
                    if (prop == 'dateTimeRange') {
                        diffsWithDates[key][prop] = {};
                        for (const dateTimeProp in value[prop]) {
                            diffsWithDates[key][prop][dateTimeProp] = new Date(value[prop][dateTimeProp]);
                        }
                    } else {
                        diffsWithDates[key][prop] = value[prop];
                    }
                }
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

    // Getters for convenient access to a single shift occurrence or metadata
    // associated with multiple shifts or occurrences.
    get currentShiftOccurrence(): ShiftOccurrence {
        return this.currentShiftOccurrenceId
            ? this.getShiftOccurrence(this.currentShiftOccurrenceId)
            : null;
    }

    get shiftsArray() {
        return Array.from(this.shifts.values());
    }

    // This is the main getter used by the calendar to get an array of ShiftOccurrenceMetadata objects.
    // Each object in the array represents a single date that's within the date range window of the shift store.
    // Each object contains the date it represents, all shift occurrences on that date, and a flag that indicates
    // whether the calendar should autoscroll to this date after retrieval (e.g. to scroll to the current day when
    // the view first loads, or to maintain a stable view when the date window expands).
    get filteredShiftOccurenceMetadata(): ShiftOccurrenceMetadata[] {
        // The final collection of dates and associated shift data that
        // is returned for the calendar component to display.
        const filteredMetadata: ShiftOccurrenceMetadata[] = [];

        // As we iterate through each shift, we store the collections by
        // date in YYYY-MM-DD format. So when we iterate through the dates
        // in our window to populate the final filteredMetadata,
        // we can index into this object for each date in our range.
        const shiftsMap: { [date: string]: ShiftOccurrence[]} = {};

        // If we don't have a valid date range, return immediately with an empty list.
        if (this.dateRange.startDate == null || this.dateRange.endDate == null) {
            return filteredMetadata;
        }

        // For each shift that we have a definition for, collect the occurrences within
        // the specified date range that satisfy the filter criteria.
        this.shiftsArray.forEach(shift => {
            // We keep track of the total shift occurrence count as we accumulate occurrences across series to ensure that the series together do not
            // generate more occurrences than the entire shift is supposed to have. Keep in mind that edits to occurrences do not generate any new
            // occurrences leading us to violate a repitition limit for example.
            let shiftOccurrenceCount = 0;

            shift.series.forEach(shiftSeries => {
                // Generate an rSchedule rule object, to generate the shift series' schedule.
                const rule = this.patchRecurrenceToRRule(shift.id, shiftSeries.recurrence, shiftOccurrenceCount);
                if (rule == null) {
                    return;
                }

                const seriesSchedule = new Schedule({
                    rrules: [rule]
                });


                // We set the end date for our occurrence retrieval to be based on the earlier date between what's specified by the
                // view and the end date of the series' recurrence, if it exists.
                const endDate = shiftSeries.recurrence.until?.date < this.dateRange.endDate
                                ? shiftSeries.recurrence.until.date
                                : this.dateRange.endDate;


                seriesSchedule.occurrences({ start: this.dateRange.startDate, end: endDate }).toArray().forEach(occurrence => {
                    // Compose id from parent shift id and occurrence date (works because no shift has multiple occurrences starting on the same day)
                    const occurrenceId = getShiftOccurrenceIdFromParts(shift.id, occurrence.date);

                    // If this occurrence id is in the deleted occurrences collection,
                    // then we do not want to produce a projected shift occurrence for this id.
                    if (!shiftSeries.deletedOccurrenceIds?.includes(occurrenceId)) {
                        // Helper function retrieves and builds up the shift occurrence object for this date.
                        const shiftOccurrence: ShiftOccurrence = this.getShiftOccurrence(occurrenceId);

                        // getShiftOccurrence if a containing shift or shift series could not be found for the
                        // given shift occurrence id.
                        if (shiftOccurrence) {
                            // This shift occurrence contributes to the count for the shift repitition
                            // whether its displayed based on the filters or not.
                            shiftOccurrenceCount++;

                            // Verify it satisfies the filter conditions before pushing to our array.
                            if (this.shiftOccurrenceSatisfiesFilters(shiftOccurrence)) {
                                // Add the occurrence to the collection of occurrences on this date.
                                const occurrenceIdParts = getPartsFromShiftOccurrenceId(occurrenceId);
                                if (!shiftsMap[occurrenceIdParts.date]) {
                                    shiftsMap[occurrenceIdParts.date] = []
                                }

                                shiftsMap[occurrenceIdParts.date].push(shiftOccurrence);
                            }
                        }
                    }
                })

                // Add detached occurrences from this series
                for (const detachedDiffId in shiftSeries.detachedDiffs) {
                    const shiftOccurrence = this.getShiftOccurrence(detachedDiffId);
                    const occurrenceIdParts = getPartsFromShiftOccurrenceId(detachedDiffId);
                    if (this.shiftOccurrenceSatisfiesFilters(shiftOccurrence)) {
                        if (!shiftsMap[occurrenceIdParts.date]) {
                            shiftsMap[occurrenceIdParts.date] = []
                        }
                        shiftsMap[occurrenceIdParts.date].push(shiftOccurrence);
                    }
                }
            });
        });

        // Iterate through each day in our specified date range.
        // For each date, get the occurrences that occur on that date.
        // Determine if the date and associated shifts should be returned
        // for display based on the filter.
        const iterDate = new Date(this.dateRange.startDate);

        const now = moment().hours(0).minutes(0).seconds(0).milliseconds(0);
        let foundFirstDate = false;
        while (iterDate <= this.dateRange.endDate) {
            const dateStr = formatShiftOccurrenceDateForId(iterDate);
            const dateShifts = shiftsMap[dateStr] || [];
            let addMetadata = this.filter.daysFilter == CalendarDaysFilter.All
                                || (this.filter.daysFilter == CalendarDaysFilter.WithShifts && dateShifts.length > 0)
                                || (this.filter.daysFilter == CalendarDaysFilter.WithoutShifts && dateShifts.length == 0);

            if (addMetadata) {
                // Since we've sequentially added shifts from potentially many different shift definitions, we need to do a final sort by start date and times.
                dateShifts.sort(function(occurrenceA, occurrenceB) {
                    const startTimeA = resolveFullDateTime(occurrenceA.dateTimeRange.startDate, occurrenceA.dateTimeRange.startTime);
                    const startTimeB = resolveFullDateTime(occurrenceB.dateTimeRange.startDate, occurrenceB.dateTimeRange.startTime);
                    const endTimeA = resolveFullDateTime(occurrenceA.dateTimeRange.endDate, occurrenceA.dateTimeRange.endTime);
                    const endTimeB = resolveFullDateTime(occurrenceB.dateTimeRange.endDate, occurrenceB.dateTimeRange.endTime);
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

    shiftOccurrenceSatisfiesFilters(shiftOccurrence: ShiftOccurrence): boolean {
        // Verify it satisfies the filter conditions before pushing to our array.
        const satisfiesRolesFilter = this.filter.rolesFilter == ShiftsRolesFilter.All
                                        || this.userHasShiftRoles(userStore().user.id, shiftOccurrence);

        const satisfiesNeedsPeopleFilter = this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.All
                                            || (this.filter.needsPeopleFilter == ShiftNeedsPeopleFilter.Unfilled
                                                && this.getShiftStatus(shiftOccurrence) != ShiftStatus.Satisfied);

        return satisfiesRolesFilter && satisfiesNeedsPeopleFilter;
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
        return filteredArray.length > 0;
    }

    patchRecurrenceToRRule(shiftId: string, recurringDateTime: RecurringDateTimeRange, occurrenceCount: number): Rule {
        // Given a PATCH definition of a recurrence, generate an rschedule Rule that can be used
        // to project the date time schedule for the provided shift (id).

        // Map a RecurringPeriod value to the proper rschedule frequency string
        const frequencyMap: { [key in RecurringPeriod]: RuleOption.Frequency } = {
            [RecurringPeriod.Month]: 'MONTHLY',
            [RecurringPeriod.Week]: 'WEEKLY',
            [RecurringPeriod.Day]: 'DAILY'
        }

        // We need to include both day and time in the duration calculation for cases where the end
        // time is on a different day than the start date.
        // Ensure that the shift duration is a positive value.
        const resolvedStart = resolveFullDateTime(recurringDateTime.startDate, recurringDateTime.startTime);
        const resolvedEnd = resolveFullDateTime(recurringDateTime.endDate, recurringDateTime.endTime);
        const shiftDuration = resolvedEnd.getTime() - resolvedStart.getTime();
        if (shiftDuration <= 0) {
            return null;
        }

        // Specify the options for the rule we're creating
        const ruleOptions: IRuleOptions = {
            start: resolveFullDateTime(recurringDateTime.startDate, recurringDateTime.startTime),
            duration: shiftDuration,
            frequency: recurringDateTime.every?.period
                        ? frequencyMap[recurringDateTime.every.period]
                        : frequencyMap[RecurringPeriod.Day],
            // From rschedule documentation: "The WKST rule part specifies the day on which the workweek starts"
            // For PATCH, the calendar/workweek starts on Sunday (0).
            weekStart: DateAdapter.WEEKDAYS[0]
        }

        // Patch recurrence "every" property corresponds to the interval property of the rule options.
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
                // To make sure this series doesn't exceed the shift-wide limit of repititons,
                // we subtract the current number of occurrences we've already accumulated.
                ruleOptions.count = recurringDateTime.until.repititions - occurrenceCount;
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

    // Filters for which shift metadata to return
    setDaysFilter = async (daysFilter: CalendarDaysFilter): Promise<void> => {
        this.filter.daysFilter = daysFilter;
    }

    setNeedsPeopleFilter = async (needsPeopleFilter: ShiftNeedsPeopleFilter): Promise<void> => {
        this.filter.needsPeopleFilter = needsPeopleFilter;
    }

    setRolesFilter = async (rolesFilter: ShiftsRolesFilter): Promise<void> => {
        this.filter.rolesFilter = rolesFilter;
    }

    // Expand the date range window by one week in the future.
    addFutureWeekToDateRange = async (): Promise<void> => {
        this.scrollToDate = null;
        const newEndDate = new Date(this.dateRange.endDate);
        newEndDate.setDate(newEndDate.getDate() + 7);
        this.dateRange = {
            startDate: this.dateRange.startDate,
            endDate: newEndDate
        }
    }

    // Expand the date range window by one week in the past.
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

    // Initialize the date window that the shift store should use as boundaries
    // for shift information to return.
    // NOTE: The view that will interact with the shift store should initialize this
    // date range.
    initializeDateRange = (dateRange: DateWindow): void => {
        this.dateRange = {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        }

        // These values are set to false. If the date range is being initialized,
        // then when shifts are retrieved, we'll treat it as an initial load and scroll.
        this.scrollToDate = null;
        this.initialScrollFinished = false;
    }

    getShiftOccurrenceDateTime(shiftSeries: ShiftSeries, diff: ShiftOccurrenceDiff, occurrenceDateStr: string): DateTimeRange {
        // This function resolves the full shift occurrence start and end dates and times.
        // Given a shift and an ISO string representing the date of an occurrence,
        // generate the date time range object that defines this specific occurrence.

        // The shift start/end time and duration is determined by the shift definition recurrence OR a diff value
        const startTime = diff?.dateTimeRange?.startTime ? diff.dateTimeRange.startTime : shiftSeries.recurrence.startTime;
        const endTime = diff?.dateTimeRange?.endTime ? diff.dateTimeRange.endTime : shiftSeries.recurrence.endTime;

        // Start date has to be retrieved from the diff OR the occurrence date string portion of its id
        // Get the time between the shift definition's start and end date to calculate the shift's default end date if necessary.
        const shiftDefDateDuration = shiftSeries.recurrence.endDate.getTime() - shiftSeries.recurrence.startDate.getTime();
        const startDate = diff?.dateTimeRange?.startDate ? diff.dateTimeRange.startDate : moment(occurrenceDateStr).hours(0).minutes(0).seconds(0).milliseconds(0).toDate();
        const endDate = diff?.dateTimeRange?.endDate
                        ? diff.dateTimeRange.endDate
                        : moment(startDate).add(shiftDefDateDuration, 'milliseconds').toDate();

        return {
            startDate: startDate,
            startTime: startTime,
            endDate: endDate,
            endTime: endTime
        }
    }

    // Retrieve the shift series that contains the shift occurrence, represented
    // by the given id.
    getShiftSeriesFromShiftOccurrenceId(shiftOccurrenceId: string): [number, ShiftSeries] {
        const occurrenceIdParts = getPartsFromShiftOccurrenceId(shiftOccurrenceId);
        const shift = this.shifts.get(occurrenceIdParts.shiftId);
        if (!shift) {
            return null;
        }

        return getShiftSeriesFromOccurrenceDateTime(shift, occurrenceIdParts.date);
    }

    // Given a shift occurrence id, return the object containing details of the occurrence.
    getShiftOccurrence(shiftOccurrenceId: string): ShiftOccurrence {
        // Parse the shift occurrence Id to get its parent shift information.
        const occurrenceIdParts = getPartsFromShiftOccurrenceId(shiftOccurrenceId);

        // Get the parent shift that this occurrence belongs to.
        const shift = this.shifts.get(occurrenceIdParts.shiftId);

        // If no shift is found, we return null and let the caller handle the failure.
        if (!shift) {
            return null;
        }

        // Once we have the shift, we identify which series this occurrence comes from.
        const [seriesIdx, shiftSeries] = getShiftSeriesFromOccurrenceDateTime(shift, occurrenceIdParts.date);
        if (!shiftSeries) {
            return null;
        }

        // Attempt to get a diff for this date's occurrence
        // If the occurrence id has a number value, then this id represents a detached diff,
        // which we retrieve by the full shift occurrence id.
        // Otherwise, we attempt to retrieve a diff from the occurrence diffs.
        const diff = occurrenceIdParts.detachedId
                        ? shiftSeries.detachedDiffs[shiftOccurrenceId]
                        : shiftSeries.projectedDiffs[shiftOccurrenceId];

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
            dateTimeRange: this.getShiftOccurrenceDateTime(shiftSeries, diff, occurrenceIdParts.date),
            title: diff?.title ? diff.title : shiftSeries.title,
            description: diff?.description ? diff.description : shiftSeries.description,
            positions: diff?.positions != null
                        ? JSON.parse(JSON.stringify(diff.positions))
                        : JSON.parse(JSON.stringify(shiftSeries.positions))
        };
    }

    // Determine to what degree a shift needs more people to fill its positions.
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

    // Retrieve the shifts specified by the incoming id array,
    // ensure that they are included in the shift store's shift map.
    // If there was a current shift id already specified, keep track
    // of the id and use it to retrieve the possibly updated occurrence
    // after the API call. If we successfully retrieve a shift occurrence,
    // set that possibly updated value to the current shift occurrence.
    async getShifts(shiftIds?: string[]): Promise<void> {
        try {
            const oldCurrentShiftOccurrenceId = this.currentShiftOccurrenceId;
            const shifts = await api().getShifts(this.orgContext(), shiftIds);

            runInAction(() => {
                shifts.forEach(s => this.updateOrAddShift(s));
                // TODO: Handle case where shift occurrence id changes as the result of an edit,
                // i.e. edit to start date.
                if (oldCurrentShiftOccurrenceId) {
                    const possibleUpdatedCurrentShift = this.getShiftOccurrence(oldCurrentShiftOccurrenceId);
                    this.setCurrentShiftOccurrence(possibleUpdatedCurrentShift);
                }
            })
        } catch (e) {
            console.error(e);
        }
    }

    setCurrentShiftOccurrence(shiftOccurrence: ShiftOccurrence): void {
        // Clear the current shift occurrence ID if the given occurrence is null
        if (!shiftOccurrence) {
            this.currentShiftOccurrenceId = null;
            return;
        }

        // Otherwise update the shift store's currend id.
        runInAction(() => {
            this.currentShiftOccurrenceId = shiftOccurrence.id;
        })
    }

    // Insert a replace a shift in our shifts map by id
    updateOrAddShift(updatedShift: WithoutDates<Shift>) {
        this._shifts.merge({
            [updatedShift.id]: updatedShift
        })
    }

    // Retrieve shifts once a user is signed in
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

    // Clear all properties on the shift store
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