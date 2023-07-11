import { Shift, ShiftSeries } from '../models';

const DELIMITER = '---';

export function userOnShiftOccurrence(userId: string, occurrenceId: string, shift: Omit<Shift, "createdAt" | "updatedAt">) {
    // NOTE: Likely that we only want to do this check when a user is attempting to edit the chat.
    // Any other shift edits should require explicit permissions.
    // return req.positions.some(pos => pos.joinedUsers.includes(userId))
    const occurrenceIdParts = getPartsFromShiftOccurrenceId(occurrenceId);
    const [idx, series] = getShiftSeriesFromOccurrenceDateTime(shift, occurrenceIdParts.date);
    return series.positions.some(pos => pos.joinedUsers.includes(userId));
}

function padDateDigits(value: number) {
    return value.toString().padStart(2, '0');
}

// Get date string in yyyy-mm-dd format
export function formatShiftOccurrenceDateForId(date: Date) {
    return [
        date.getFullYear(),
        padDateDigits(date.getMonth() + 1),
        padDateDigits(date.getDate()),
    ].join('-');
}

// Because the date parameter may be coming from the backend, it may be a string that needs to be converted to a date.
export function getShiftOccurrenceIdFromParts(shiftId: string, date: Date | string, detachedId?: string): string {
    // Shift Occurrence Id consists of the parent shift ID concatenated
    // with the ISO date formatted string of the day of the occurrence.
    // Optionally, if a shift occurrence is detached from any series recurrence,
    // in addition to its date string, it will have an additional unique id to
    // distinguish it from other detached shift occurrences on the same date.
    return `${shiftId}${DELIMITER}${formatShiftOccurrenceDateForId(new Date(date))}${detachedId ? DELIMITER + detachedId : ""}`;
}

export function getPartsFromShiftOccurrenceId(shiftOccurrenceId: string): { shiftId: string, date: string, detachedId?: string } {
    // Split a shift occurrence id into its parent ID and date components.
    // Optionally, if an occurrence is detached from the recurrence rules of its series,
    // it will have value for the number property, meaning it is the nth occurrence on its date.
    if (!shiftOccurrenceId) {
        return null;
    }

    const idParts = shiftOccurrenceId.split(DELIMITER);
    if (idParts.length == 3) {
        return {
            shiftId: idParts[0],
            date: idParts[1],
            detachedId: idParts[2]
        }
    } else {
        return {
            shiftId: idParts[0],
            date: idParts[1],
        }
    }
}

export function getShiftOccurrenceDateStrFromId(shiftOccurrenceId: string): string {
    const occurrenceIdParts = getPartsFromShiftOccurrenceId(shiftOccurrenceId);
    return occurrenceIdParts.date;
}

// TODO (bug): The first occurrence of a series is not found (and therefore returns [-1, null]) because
// as of now somewhere in the usage of the series start date time, it ends up including
// a time component that the occurrence date does not use OR there is a bug with time zones somewhere
// from switching between moment and JS standard Date objects.

// TODO: While the bug above exists, we also need to change this function in general to
// consider both time and date of an occurrence since shift series will begin and end with that granularity.
// The bug may be fixed by virtue of that.
export function getShiftSeriesFromOccurrenceDateTime(shift: Omit<Shift, 'createdAt' | 'updatedAt'>, date: string): [number, ShiftSeries] {
    const occurrenceDate = new Date(date);

    // The last series (in our ordered list of series), for which the
    // series start date is either the same or before the occurrence
    // date is the series that the occurrence belongs to.
    for (let idx = shift.series.length - 1; idx >= 0; idx--) {
        const seriesStartDate = new Date(shift.series[idx].startDate);

        if (occurrenceDate >= seriesStartDate) {
            return [idx, shift.series[idx]];
        }
    }

    // If the occurrence date is before all series in the shift, then
    // the occurrence is no longer reachable.
    return [-1, null];
}

export function getShiftSeriesFromShiftOccurrenceId(shift: Omit<Shift, 'createdAt' | 'updatedAt'>, shiftOccurrenceId: string): [number, ShiftSeries] {
    const occurrenceIdParts = getPartsFromShiftOccurrenceId(shiftOccurrenceId);
    return getShiftSeriesFromOccurrenceDateTime(shift, occurrenceIdParts.date);
}

export function getShiftIdFromShiftOccurrenceId(shiftOccurrenceId: string): string {
    // Return just the parent shift id from a shift occurrence id
    return shiftOccurrenceId.split(DELIMITER)[0];
}

// Give the date and time components for a shift occurrence, resolve the full date and time value.
export function resolveFullDateTime(date: Date | string, time: Date | string): Date {
    const resolvedDate = new Date(date);
    const resolvedTime = new Date(time);
    resolvedDate.setHours(resolvedTime.getHours());
    resolvedDate.setMinutes(resolvedTime.getMinutes());
    resolvedDate.setSeconds(0);
    resolvedDate.setMilliseconds(0);
    return resolvedDate;
}