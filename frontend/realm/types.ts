import { User } from "../../common/models";

/////////////////
// collections //
/////////////////

// pub/priv key encrypted users accessible to everyone but
// only readable by the user
// NOTE: publicKey and id are not encrypted
export type GlobalUser = User & {
    publicKey: string
};

// this being org specific means you must be added to an org 
// before you can use get access to its keys
// Note: a global version of this will need to exist for intra-org 
// communication down the road
export type OrgKeyDrop = {
    userId: string,
    orgId: string,
    keys: {
        [keyType in KeyType]: KeyMetadata
    }
}

// org key encrypted users accesible to everyone 
// in org
export type OrgUser = GlobalUser & {
    orgId: string
};


/////////////////
//    types    //
/////////////////

// semantic key type
export enum KeyType {
    OrgKey = 'ok',
    OrgAdminKey = 'oak'
}

export type KeyMetadata = {
    // specific key id
    kid: string,
    // string if only need one user to grant it, shards
    // if multiple granters are necesary for this key 
    value: string | {
        [granterId: string]: string
    }
}
