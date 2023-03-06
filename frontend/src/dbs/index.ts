import { container } from "../meta";
import { validateMappings } from "../utils";
import { GlobalUserDB } from "./globalUserDB";
import { AllDBs, IBaseDB, IGlobalUserDB, IOrgUserDB } from "./interfaces";
import { getDB } from "./meta";
import { OrgUserDB } from "./orgUserDB";

const dbMappings: [{ id: symbol }, new () => any][] = [
    [ IOrgUserDB, OrgUserDB ],
    [ IGlobalUserDB, GlobalUserDB ]
];

export function bindDBs() {
    validateMappings(dbMappings, AllDBs, 'DB')

    for (const [ iDB, db ] of dbMappings) {
        container.isBound(iDB.id) || container.bind(iDB.id).to(db).inSingletonScope();
    }
}

export async function initDBs() {
    await Promise.all(dbMappings.map(([ iDB, _ ]) => {
        const db = getDB<IBaseDB>(iDB);
        return db.init();
    }));
}