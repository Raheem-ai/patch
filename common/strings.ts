const STRINGS = {

    // GLOBAL
    visualDelim: '·',
    responders: (n: number) => n > 1 ? 'responders' : 'responder',
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

    REQUESTS: {
        NOTIFICATIONS: {
            notifyNResponders: (n: number) => `Notify ${n} ${STRINGS.responders(n)}`,
            NRespondersNotified: (n: number) => `${n} ${n === 1 ? `person` : `people`} notified`,
            NRespondersAsking: (n: number) => ` ${STRINGS.visualDelim} ${n} asking`,
            notifyPeople: `Notify people`,
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
        userNotFound: (email: string) => `User with email ${email} not found`,
        userExists: (email: string) => `User with email ${email} already exists.`,
        wrongPassword: `Password is incorrect`,
        signInForAPI: `You must be signed in to call this api`,
        noOrgScope: `No org scope supplied`,
        noOrgAccess: `You do not have access to the requested org.`,
        unauthorized: `Unauthorized user`,
        notInOrg: (usersNotInOrg:string[], orgName:string) => `Users with ids: ${usersNotInOrg.join(', ')} are not in org: ${orgName}`,
        roleRequired: `You must invite a user with at least one role.`,
        joinOrg: (orgName:string, link:string, existingUser:boolean) => `You have been invited to ${!existingUser ? 'sign up and ' : null}join ${orgName} on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join ${orgName}.\n${link}`,
        invitationSuccessful: (email:string, phone:string) => `Invitation sent to email ${email} and phone ${phone}.`,
        twilioError: (msg:string) => `Twilio Error: ${msg}`,
        cannotEditRole: (roleName:string) => `The '${roleName}' role cannot be edited`,
        cannotDeleteRole: (roleName:string) => `The '${roleName}' role cannot be deleted`,
        noPermissionToEditRoles: `You do not have permission to edit Roles associated with your profile.`,
        noPermissionToEditAttributes: `You do not have permission to edit Attributes associated with your profile.`,
        noPermissionToEditUserRoles: `You do not have permission to edit Roles associated with this user's profile.`,
        noPermissionToEditUserAttributes: `You do not have permission to edit Attributes associated with this user's profile.`,

    },
}

export default STRINGS;
