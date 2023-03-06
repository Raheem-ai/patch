// should these be static config? 
// these roles are document/field level

/**
 * Q: how do we do collection level?
 * A: apply_when is dynamic so we can 
 * say you only have access to docs of a specific
 * type if you are a part of the org/have correct PatchPermission 
 * in org
 */ 


/** 
 {
  "name": "Manager",
  "apply_when": { "email": "%%user.custom_data.manages" },
  "insert": true,
  "delete": true,
  "read": true,
  "write": true,
  "search": true,
  "fields": {},
  "additional_fields": {
    "read": true,
    "write": true
  }
}
{
  "name": "Employee",
  "apply_when": { "email": "%%user.data.email" },
  "insert": false,
  "delete": false,
  "read": true,
  "write": true,
  "search": true,
  "fields": {},
  "additional_fields": {
    "read": true,
    "write": true
  }
}
 */