import { container } from "../meta";
import { IBaseDB, IOrgUserDB } from "./interfaces";
import { getDB } from "./meta";
import { OrgUserDB } from "./orgUserDB";

const serviceMappings: [{ id: symbol }, new () => any][] = [
    [ IOrgUserDB, OrgUserDB ],
];

export function bindDBs() {
    for (const [ iDB, db ] of serviceMappings) {
        container.isBound(iDB.id) || container.bind(iDB.id).to(db).inSingletonScope();
    }
}

export async function initDBs() {
    await Promise.all(serviceMappings.map(([ iDB, _ ]) => {
        const db = getDB<IBaseDB>(iDB);
        return db.init();
    }));
}