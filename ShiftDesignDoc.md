# Design Doc for Shifts + Chats

## Type Definitions + Assumptions
```ts

/**
 * Disclaimer: all Permissions are subject to change/re-arrange to a set that makes sense 
 * for our final mental model
 * */
enum Permissions {
    ReadRequests
    EditRequests
    CreateRequests
    //...
}

type Role = {
    id: string
    permissions: Permission[]
}

type Tag = {
 // ...
}

type TagCategory = {
 // ...
}

type Shift = {
    id: string

    positions: ShiftPosition[]
    requiredTags: string[] // string representation of the Tag which also acts as a unique id
    requiredRoles: string[] // id of required Roles 
    timeConstraints: RepeatingTimeConstraints

    /**
     * Shift/Position + required Tag/Role + time constraint Semantics:
     * 
     * - A single User may only fill 1 Position on any given Shift.
     * - The required Roles/Tags on a Shift 
     *      -> do not act as a restriction that prevents a User from joining a Shift
     *      -> are Shift wide ie. satisfiable by anyone on the Shift
     *      -> are factored into the status of the Shift
     *      -> are used to help sort better suggestions when choosing a User if we have 'assign shift' feature
     * - A Shift must have at least 1 Position
     * - A Position must have a min of 1 slots up to an optional max (1-infinity) slots
     * - A Shift will have a negative status if any of its Positions haven't been fulfilled up to their min slots
     * - The required Roles/Tags on a Position are required by each individual User that fills one of it's slots
     *      -> this can be bipassed with approval by a User with the right Permission
     * - A Shift must set when the whole shift starts/ends and if it repeats over some period.
     * - A Position may optionally set it's own start/end time 
     *      -> as long as that window of time is contained in the Shift's time ie. no 4 hour Positions in a 2 hour Shift.
     *      -> if the Position doesn't specifiy a start/end time it is treated as though it's start/end time matches the containing Shift.
     * */
}

type ShiftPosition = {
    requiredRoles: string[] // id of required Roles 
    requiredTags: string[] // string representation of the Tag which also acts as a unique id
    min: number

    // optional
    max?: number // defaults to min if you don't explicitely set...-1 == inifity
    name?: string
    timeConstraints?: TimeConstraints // defaults to containing Shift's time constraints ie. full day event analogy
}

type TimeConstraints = {
    start: Date | null // default = now
    end: Date | null // default = infinity
}

type RepeatableTimeConstraints = TimeConstraints & {
    repeatEvery?: 'day' | 'week' | 'month' //...something like this
}

type PrivateChat = {
    id: string,
    allowedUsers: string[],

    // start/end time for chat to exist
    timeConstraints: TimeConstraints,
    // how long the data for a chat should be stored (read retrievable)
    dataRetentionWindowInMins?: number,
}
    
type Chat = PrivateChat & {
    allowedRoles: Role[],
    allowedTags: string[],
    allowedShifts: string[],

    // how long users without Permissions.EncryptionAdmin can see the chat data
    dataAccessWindowInMins?: number,

    // What to do when a User is no longer in the set we defined for the chat. Could 
    // also let you choose between "Boot From Chat", "Notify Admins", and "Do Nothing"
    // would only show this in UI when you have a Role, Tag, or Shift specified
    autoBoot?: boolean,

    /**
     * 
     * Each Chat acts as a smart abstraction around any set of Users having End2End 
     * encrypted communication for a configurable amount of time. Users can be added by 
     * any User with Permissions.ManageChat. Users can be removed by themselves, any 
     * ChatManager, and by the Chat itself depending on how it was set up.
     * 
     * At a base level any User with Permissions.CreateGroupChat (seperate from 
     * Permissions.CreateChat to dm another User) can create a new Chat. When they 
     * create it they have to tell us what Users have access to it. This could be 
     * *any mix of* directly choosing users like you would starting any adhock groupchat 
     * (or dm for that matter), being based off of Tags/Roles, or Users in a Shift. We 
     * *could* even go so far as to let you add specific Positions in a Shift. The 
     * point is we can go as deep as we want in terms of how we let you describe your
     * target group of Users but once you set it up we should handle all updates of when 
     * User loses a Role or Tag or cancels on a Shift and we need to remove them from the  
     * Chat. That could also be a setting if that's too severe of a default.
     * 
     * In terms of data retention, I think we should have a setting for 
     * timeConstraints (if a chat has a start/end date), an *optional* 
     * data retention window and an *optional* data access window. In terms of semantics:
     * 
     * *** disclaimer: these would be under "Advanced Settings" or otherwise out of the way ***
     * 
     * - Chat timeConstraints >= data retention window >= data access window
     * - data retention/access windows default to the full life of the chat
     *      -> if you never set anything the chat will run indefinately with everyone 
     *      in it having access to the whole chat forever (though I vote we have policies 
     *      around this because of storage costs/liability to be subpoenaed)
     *      -> if this is just two Users it's a DM (only they are in charge of their 
     *      encryption keys for that chat)
     * - if a Chat doesn't have an explicit end time, it's end time is treated as infinity 
     * meaning the data retention/access windows can be arbitrarily long lived 
     *      -> ie. MHFirst wants their chat to last week over week updating who has access 
     *      based on who's on shift so the equipment people can coordinate but they also 
     *      have their data retention time set to 7 days and their data access time set to 
     *      12 hours. Users with Permissions.EncryptionAdmin 
     *      can see/export up to last 7 days but all other users can only see the last 12 
     *      hours of the chat at any given time
     * - You can export a chat if enough Users with Permissions.EncryptionAdmin sign off on it.
     * - When a chat is deleted all data is deleted along with it. 
     * - Any User can create a DM (A Chat with only two Users where they are in control of their 
     * keys (ie they can delete the data))
     * */
}

```

## Examples
### MH First 
I want 3 people, all with the `Responder::R`, at least one of which has the `[Languages:Spanish]`, 2 of which have the `[Training:LegalObserver]`, and one of which has the `[Credentials:DriversLiscense]` and `[Equipment:Car]`...where the legal observers and driver are mutually exclusive because you want observers to be able to be observing full time and the User who has access to the car to be the one driving it. I want to be able to add any amount of new volunteers to be able to shadow with read only permissions to things. I want 1/2 folx on equipment gathering/distribution available during the shift.

```ts
const ObserverResponder: ShiftPosition = {
    requiredRoles: [
        'Responder-xxx-yyy'
    ],
    requiredTags: [
        'Training:LegalObserver'
    ],
    // exactly 2
    min: 2,
    max: 2,
    timeConstraints: {
        start: new Date(/** 8PM Fri */),
        end: new Date(/** 2AM Sat */)
    }
}

const DriverResponder: ShiftPosition = { 
    requiredRoles: [
        'Responder-xxx-yyy'
    ],
    requiredTags: [
        'Equipment:Car',
        'Credentials:DriversLiscense'
    ]
    // exactly 1
    min: 1
    max: 1,
    timeConstraints: {
        start: new Date(/** 8PM Fri */),
        end: new Date(/** 2AM Sat */)
    }
}

const Shadow: ShiftPosition = { 
    requiredRoles: [
        'Shadow-xxx-yyy'
    ],
    requiredTags: []
    // 1 or more
    min: 1
    max: -1,
    // let the shadows go home early
    timeConstraints: {
        start: new Date(/** 8PM Fri */),
        end: new Date(/** 12AM Sat */)
    }
}

// Position start/end times match containing Shift
const Equipment: ShiftPosition = { 
    requiredRoles: [],
    requiredTags: []
    // 1 - 2
    min: 1
    max: 2
}
 
const WeekendEast: Shift = {
    id: 'WeekendEast-xxx-yyy', 
    positions: [
        ObserverResponder,
        DriverResponder,
        Shadow,
        Equipment
    ],
    requiredTags: [
        'Language:Spanish'
    ]
    timeConstraints: {
        // ...
        // 1) Run 4pm Fri through 8pm Sunday 
        // 2) Repeat every week
        // ...
    }
}

const WeekendEastShiftChat: Chat = {
    id: 'WeekendEastShiftChat-xxx-yyy',
    
    allowedRoles: [],
    allowedTags: [],
    allowedUsers: [],
    allowedShifts: [
        'WeekendEast-xxx-yyy'
    ],

    timeConstraints: {
        start: new Date(/* create time */),
        end: null
    },
    dataRetentionWindowInMins: 7 * 24 * 60,
    dataAccessWindowInMins: 12 * 60,
    autoBoot: true
}

const JenMeiAndVChat: PrivateChat = {
    id: 'JenMeiAndVChat-xxx-yyy',
    allowedUsers: [
        'JenMei-xxx-yyy',
        'V-xxx-yyy'
    ],
    timeConstraints: {
        start: new Date(/* create time */),
        end: null
    },
    dataRetentionWindowInMins: null,
}
```
### DASHR
I want to create a new Shift for tomorrow with at least one representative from each of the two Orgs I collaborate with and as many volunteers to show up as possible.

```ts

// assuming the following Role definitions
const DeLaRazaRep: Role = {
    id: 'DeLaRazaRep-xxx-yyy',
    permissions: [
        Permissions.ManageShift // so they can invite people?
    ]
}

const OtherOrgRep: Role = {
    id: 'OtherOrgRep-xxx-yyy',
    permissions: [
        Permissions.ManageShift // so they can invite people?
    ]
}

```

what other permissions would Vinnie want here? ^^^

```ts 
// Position start/end times match containing Shift
const DeLaRazaRep: ShiftPosition = { 
    requiredRoles: [
        'DeLaRazaRep-xxx-yyy'
    ],
    requiredTags: []
    // 1 or more
    min: 1
    max: -1,
}

// Position start/end times match containing Shift
const OtherOrgRep: ShiftPosition = { 
    requiredRoles: [
        'OtherOrgRep-xxx-yyy'
    ],
    requiredTags: []
    // 1 or more
    min: 1
    max: -1,
}

// Position start/end times match containing Shift
const Volunteer: ShiftPosition = { 
    requiredRoles: [],
    requiredTags: []
    // 1 or more
    min: 1
    max: -1
}
 
const WeekendEast: Shift = {
    id: 'WeekendEast-xxx-yyy',
    positions: [
        DeLaRazaRep,
        OtherOrgRep,
        Volunteer
    ],
    requiredTags: []
    timeConstraints: {
        // ...
        // 1) Run noon Sat through 8pm Sat 
        // 2) Repeat never
        // ...
    }
}

// completely open chat that is end to end encrypted for anyone who doesn't
// leave or get booted by an admin 
const DASHROrgwideChat: Chat = {
    id: 'DASHROrgwideChat-xxx-yyy',
    
    allowedRoles: [
        'Anyone-xxx-yyy'
    ],
    allowedTags: [],
    allowedUsers: [],
    allowedShifts: [],

    timeConstraints: {
        start: new Date(/* create time */),
        end: null
    },
    dataRetentionWindowInMins: null,
    dataAccessWindowInMins: null,
    autoBoot: false
}
```

### What this doesn't cover:
- There is no concept of "ShiftTeams" within a Shift that contain a set of Positions ie. In the `MHFirst` example can't say I 1 Shift with two ShiftTeams, that each have 2 ObserverResponders and 1 DriverResponder, that start/end at different times. That would mean EITHER
    - creating a seperate shift for responders with a different star/end time...which means having to duplicate all of the support :/
    - OR (preferred as a "ShiftTeams" workaround) creating seperate positions for the different start/end times ie. ```const DriverResponderEarly: ShiftPosition = ...```, ```const DriverResponderLate: ShiftPosition = ...```, ```const ObserverResponderEarly: ShiftPosition = ...``` and ```const ObserverResponderLate: ShiftPosition = ...```
- being able to say Users have access to a Chat for an exact time window ie. from 4PM Fri to 8PM Sun every week.
- Users can't create a Chat (non DM) unless they have the right "admin level" Permissions