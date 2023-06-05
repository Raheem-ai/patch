export type AtLeast<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

type AtLeastOne<T> = [T, ...T[]];

export const exhaustiveStringTuple = <T extends string>() =>
    <L extends AtLeastOne<T>>(
        ...x: L extends any ? (
            Exclude<T, L[number]> extends never ? 
            L : 
            Exclude<T, L[number]>[]
    ) : never
) => x;