import { Ref } from "@tsed/mongoose"
import { Organization } from "common/models";

export type PrivProps<T> = {
    [key in keyof T]?: 0
}

export type WithRefs<T, K extends keyof T> = {
    [key in keyof T]: key extends K 
        ? T[key] extends (infer U)[] 
            ? Ref<U>[]
            : Ref<T[key]>
        : T[key] 
}

export type Populated<T, K extends keyof T> = {
    [key in keyof T]: key extends K 
        ? T[key] extends Ref<infer U>[] 
            ? U[]
            : T[key]
        : T[key] 
}

