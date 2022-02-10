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

export function timestampToTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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