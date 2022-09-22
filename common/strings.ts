import { requestDisplayName } from './utils/requestUtils';

type CaseAndNumber = {
    cap?: boolean,
    plural?: boolean
};

const STRINGS = {
    // GLOBAL
    ELEMENTS: {
        // To do: refactor role and request props to be simpler
        role: (props?:CaseAndNumber) => (props?.cap 
            ? props?.plural
                ? 'Roles'
                : 'Role'
            : props?.plural
                ? 'roles'
                : 'role'
        ),
        shift: 'shift',
        attribute: 'attributes',
        tag: 'tag',
        position: `position`,
        request: (props?:CaseAndNumber) => (props?.cap 
            ? props?.plural
                ? 'Requests'
                : 'Request'
            : props?.plural
                ? 'requests'
                : 'request'
        ) 
    },
    visualDelim: '·',
    responders: (n: number) => (n > 1 || n == 0) ? 'responders' : 'responder',
    nResponders: (n: number) => `${n == 0 ? 'No' : n} ${STRINGS.responders(n)}`,
    people: (n: number) => n ==1 ? 'person' : 'people',
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
    PAGE_TITLES: {
        landing: 'Landing',
        joinOrganization: 'Join Organization',
        invitationSuccessful: 'Invitation Successful',
        createAccount: 'Create Account',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signUpThroughOrg: 'Sign Up',
        userHomePage: 'Home',
        helpRequestList: 'Requests',
        helpRequestMap: 'Requests',
        helpRequestIdWhileLoading: '',
        helpRequestChat: (prefix:string, id:string) => `Channel for ${requestDisplayName(prefix, id)}`,
        teamList: 'Team',
        settings: 'Settings',
        channels: 'Channels',
        componentLibrary: 'Component Library'
    },
    REQUESTS: {
        editRequestTitle: (prefix:string, requestName:string) => `Edit ${requestDisplayName(prefix, requestName)}`,
        description: 'Description',
        callStart: 'Call start',
        callEnd: 'Call end',
        requestType: 'Type of request',
        Location: 'Location',
        callerName: 'Caller name',
        callerContactInfo: 'Caller contact info',
        positions: 'Responders needed',
        priority: 'Priority',
        tags: 'Tags',
        NOTIFICATIONS: {
            notifyNPeople: (n: number) => `Notify ${STRINGS.nPeople(n)}`,
            nRespondersNotified: (n: number) => `${STRINGS.nResponders(n)} notified`,
            nPeopleNotified: (n: number) => `${STRINGS.nPeople(n)} notified`,
            nRespondersAsking: (n: number) => ` ${STRINGS.visualDelim} ${n} asking`,
            notifyPeople: `Notify people`,
            filterToShow: 'People to show',
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
            removeUser: (userName:string) => `${userName} isn't on this position.`,
            removeFromPositionDialogTitle: (userName:string) =>`Remove ${userName}?`,
            removeFromPositionDialogText: (userName:string) => `${userName} will no longer be on this position.`,
            removeFromPositionDialogOptionNo: 'Cancel',
            removeFromPositionDialogOptionYes:  `Remove`,    
            removedUserName: '(Removed)',
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
    CHANNELS: {
        noMessages: '...',
    },
    ACCOUNT: {
        inviteTitle: `Invite to team`,
        profileTitle: 'Profile',
        profileTitleMine: 'My profile',
        editUserProfile: (userName: string) => `Edit ${userName}'s profile`,
        editMyProfile: 'Edit my profile',
        sendInvite: `Send Invite`,
        welcomeToPatch: `Welcome to PATCH!`,
        userNotFound: (email: string) => `User with email ${email} not found`,
        userExists: (email: string) => `User with email ${email} already exists.`,
        wrongPassword: `Password is incorrect`,
        signInForAPI: `You must be signed in to call this api`,
        noOrgScope: `No org scope supplied`,
        noOrgAccess: `You do not have access to the requested org.`,
        unauthorized: `Unauthorized user`,
        removeDialogTitle: (isMe:boolean) => isMe ? `Leave organization?` : `Remove from organization?`,
        removeDialogText: (isMe:boolean, userName:string) => `${isMe ? 'You' : userName} will need to be reinvited to regain access to this organization.`,
        removeDialogOptionNo: 'Cancel',
        removeDialogOptionYes: (isMe:boolean, userName:string) => isMe ? `Leave organization` : `Remove ${userName}`,
        removeUser: (isMe:boolean) => isMe ? 'Leave organization' : 'Remove from organization',
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
        rolesIntroA: 'Use Roles to specify who does what for a Shift or Request.',
        rolesIntroB: 'Each role grants the permissions needed for that role. A person can be eligible for more than one role.',
        deleteRole: 'Delete this role',
        nameRole: 'Name this role',
        setPermissions: 'Set permissions',
        rolesAndPermissions: 'Roles + permissions',
        cannotEditRole: (roleName:string) => `The ${roleName} role cannot be edited`,
        cannotDeleteRole: (roleName:string) => `The ${roleName} role cannot be deleted`,
        assignedToAll: ' (assigned to all members)',
        removeRoleDialogTitle: (roleName:string) =>`Remove ${roleName} role?`,
        removeRoleDialogText: (roleName:string) => `The ${roleName} role (and its permissions) will be removed from all team members.`,
        removeRoleDialogOptionNo: 'Cancel',
        removeRoleDialogOptionYes:  `Remove`, 
    }
}

export default STRINGS;
