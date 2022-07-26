// This file is only for utils that DONT utilize the types in models

// all enum values should either be an uncapitalized string or number and all enum keys
// should be capitalized
// NOTE: this means all string enums need to be lower case ie 'foo','bar', 'ab'
export function allEnumValues<T=any>(e: any): T[] {
    const values = Object.values(e);
    if(!values.every(val => typeof val == 'string')) {
        return values.filter(val => typeof val == 'number') as T[];
    } else {
        return values.filter((val) => val[0] == val[0].toLowerCase()) as T[];
    }
}

export function timestampToTimeString(timestamp: number) {
    return dateToTimeString(new Date(timestamp))
}

// '09:12 AM'
export function dateToTimeString(date: Date) {
    // https://www.jsman.net/manual/Standard-Global-Objects/Date/toLocaleTimeString
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// 'Wednesday, Mar 30'
export function dateToDateString(date: Date) {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit' })
}

// 'Wednesday, Mar 30, 2022'
export function dateToDateYearString(date: Date) {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' })
}

// 'Wednesday'
export function dateToDayOfWeekString(date: Date) {
    return date.toLocaleDateString([], { weekday: 'long' })
}

export function unwrap<T>(val: NotAFunction<T> | (() => NotAFunction<T>)): T {
    return typeof val == 'function'
        ? (val as () => NotAFunction<T>)()
        : val;
}

export const sleep = (ms: number) => {
    return new Promise((res) => setTimeout(res, ms));
}

export type NotAFunction<T> = T extends Function ? never : T;

export const dayNumToDayNameLabel = (num: number) => {
    switch (num) {
        case 0:
            return 'Sunday';
        case 1:
            return 'Monday';
        case 2:
            return 'Tuesday';
        case 3:
            return 'Wednesday';
        case 4:
            return 'Thursday';
        case 5:
            return 'Friday';
        case 6:
            return 'Saturday';    
    }

    throw 'bad day value'
}

export const daysToRecurringDaysLabel = (days: number[]) => {
    let selectedDayText;

    if (days.length == 1) {
        selectedDayText = dayNumToDayNameLabel(days[0])
    } else {
        const dayNames = days.map(dayNumToDayNameLabel);
        const lastDay = dayNames.pop();

        selectedDayText = `${dayNames.join(', ')} and ${lastDay}`
    }

    return `On ${selectedDayText}`
}

// NOTE: this doesn't work well with localization
export const nthLabel = (n: number) => {
    const suffix = n % 10 == 1
            ? n < 10 || n > 20
                ? 'st' // 1st, 21st, 31st...
                : 'th' // 11th
            : n % 10 == 2
                ? n < 10 || n > 20
                    ? 'nd' // 2nd, 22nd, 32nd...
                    : 'th' // 12th
                : n % 10 == 3
                    ? n < 10 || n > 20
                        ? 'rd' // 3rd, 23rd, 33rd...
                        : 'th' // 13th
                    : 'th';

    return `${n}${suffix}`
}

export const dayToNthDayOfMonthLabel = (dayNum: number) => {
    return `On the ${nthLabel(dayNum)} day of the month`
}

export const dayToNthDayOfWeekLabel = (dayNum: number) => {
    return `On the ${nthLabel(dayNum)} day of the week`
}

export const dateToEndDateLabel = (possibleDate?: Date) => {
    const date = possibleDate
        ? dateToDateYearString(possibleDate)
        : 'a date';

    return `Ends on ${date}`;
}

export const dateToEndRepititionsLabel = (reps?: number) => {
    const aNumberOf = reps || 'a number of'

    return `Ends after ${aNumberOf} ${reps == 1 ? 'repetition' : 'repetitions'}`
}