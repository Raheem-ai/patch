const realmAppId = 'patch-mljxq' //TODO: come from config
export const realmApp = Realm.App.getApp(realmAppId)

export const dbNameKey = Symbol('dbNameKey');
