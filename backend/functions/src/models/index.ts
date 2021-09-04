export type PrivProps<T> = {
    [key in keyof T]?: 0
}