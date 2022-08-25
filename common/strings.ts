const STRINGS = {
    // GLOBAL
    ELEMENTS: {
        role: 'role',
        shift: 'shift',
        attribute: 'attributes',
        tag: 'tag',
        position: `position`,
    },
    visualDelim: '·',
    responders: (n: number) => n > 1 ? 'responders' : 'responder',
    nResponders: (n: number) => `${n} ${STRINGS.responders(n)}`,
    people: (n: number) => n > 1 ? 'people' : 'person',
    nPeople: (n: number) => `${n} ${STRINGS.people(n)}`,
    daysOfWeek: {
        su: 'Sunday',
        mo: 'Monday',
        tu: 'Tuesday',
        we: 'Wednesday',
        th: 'Thursday',
        fr: 'Friday',
        sa: 'Saturday',
    },
    abbreviatedDaysOfWeek: {
        su: 'S',
        mo: 'M',
        tu: 'T',
        we: 'W',
        th: 'T',
        fr: 'F',
        sa: 'S',
    },
    LINKS: {
        helpCenter: 'Documentation',
        newTicket: 'Report an issue',
    },
    INTERFACE: {
        addElement: (el?:string) => `Add${el ? ' ' + el : ''}`,
        addCategory: (el?:string) => `Add${el ? ' ' + el : ''} category`,
        addAnotherElement: (el?:string) => `Add another ${el}`,

    },
    REQUESTS: {
        NOTIFICATIONS: {
            notifyNResponders: (n: number) => `Notify ${STRINGS.nResponders(n)}`,
            nRespondersNotified: (n: number) => `${STRINGS.nResponders(n)} notified`,
            nPeopleNotified: (n: number) => `${STRINGS.nPeople(n)} notified`,
            nRespondersAsking: (n: number) => ` ${STRINGS.visualDelim} ${n} asking`,
            notifyPeople: `Notify people`,
            selectAll: 'select all',
            unselectAll: 'unselect all',
            SECTIONS: {
                asked: `Asked to join`,
                denied: `Denied`,
                joined: `Joined`,
                viewed: `Viewed request`,
                sent: `Sent notification`,
            }
        },
        POSITIONS: {
            cannotJoin: `You do not have the required attributes and/or role to join this poition.`,
            leave: `Leave`,
            join: `Join`,
            request: `Request`,
        },
        TOGGLE: {
            toggleRequest: (isOpen: boolean) => isOpen ? `Close this request` : `Re-open this request`,
            title: `Type of request`,
            message: `Are you sure you want to close this request without specifying its type?`,
            add: `Add now`,
            close: `Close anyway`
        },
        ACTIONS: {
            addResponders: 'Add responders',
        }
    },
    ACCOUNT: {
        inviteTitle: `Invite to team`,
        sendInvite: `Send Invite`,
        welcomeToPatch: `Welcome to PATCH!`,
        userNotFound: (email: string) => `User with email ${email} not found`,
        userExists: (email: string) => `User with email ${email} already exists.`,
        wrongPassword: `Password is incorrect`,
        signInForAPI: `You must be signed in to call this api`,
        noOrgScope: `No org scope supplied`,
        noOrgAccess: `You do not have access to the requested org.`,
        unauthorized: `Unauthorized user`,
        notInOrg: (usersNotInOrg:string[], orgName:string) => `Users with ids: ${usersNotInOrg.join(', ')} are not in org: ${orgName}`,
        roleRequired: `You must invite a user with at least one role.`,
        joinOrg: (orgName:string, link:string, existingUser:boolean) => `You have been invited to ${!existingUser ? 'sign up and ' : ''}join ${orgName} on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join ${orgName}.\n${link}`,
        alreadyInOrg: (orgName: string) => `You are already a member of ${orgName}!`,
        invitationSuccessful: (email:string, phone:string) => `Invitation sent to email ${email} and phone ${phone}.`,
        inviteNotFound: (userEmail: string, orgName: string) => `Invite for user with email ${userEmail} to join '${orgName}' not found`,
        twilioError: (msg:string) => `Twilio Error: ${msg}`,
        
        noPermissionToEditRoles: `You do not have permission to edit Roles associated with your profile.`,
        noPermissionToEditAttributes: `You do not have permission to edit Attributes associated with your profile.`,
        noPermissionToEditUserRoles: `You do not have permission to edit Roles associated with this user's profile.`,
        noPermissionToEditUserAttributes: `You do not have permission to edit Attributes associated with this user's profile.`,
        removedUserSuccess: (name:string) => `Successfully removed ${name} from your organization.`,
        updatedProfileSuccess: (name?:string) => `Successfully updated ${name ? name + `'s` : `your`} profile.`,
        updatedRequestSuccess: (req:string) => `Successfully updated ${req}.`,
        createdRequestSuccess: (req:string) => `Successfully created ${req}.`,

    },
    SETTINGS: {
        deleteRole: 'Delete this role',
        cannotEditRole: (roleName:string) => `The ${roleName} role cannot be edited`,
        cannotDeleteRole: (roleName:string) => `The ${roleName} role cannot be deleted`,
        assignedToAll: ' (assigned to all members)',
    }
}

export default STRINGS;
