import { getDB } from "./meta";

export interface IBaseDB {
    init?(): Promise<void>
    clear(): void
}

export interface IOrgUserDB extends IBaseDB {

}