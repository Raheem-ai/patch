// TODO: 
// 1) need mongos types
// 2) need our base collection types

exports = async function() {
    const mongodb = context.services.get("mongodb-atlas");

    const orgId = ''; // ?
    const userId = ''; // ?

    const org = mongodb
       .db("path")
       .collection("organizations")
       .findOne({ id: orgId })

    return org.members.contains(userId);
}