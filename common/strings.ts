import { requestDisplayName } from './utils/requestUtils';
import { minPasswordLength } from '../common/constants';

type CaseAndNumber = {
    cap?: boolean,
    plural?: boolean
};

const STRINGS = {
    // GLOBAL
    emailAddresses: {
        help: `help@getpatch.org`,
    },
    cap: (str: string) => { return `${str[0].toUpperCase()}${str.substring(1)}` },
    ELEMENTS: {
        // To do: refactor role and request props to be simpler
        role: (isPlural?: boolean) => (isPlural 
            ? 'roles'
            : 'role'
        ),
        attribute: (props?: CaseAndNumber) => (props?.cap 
            ? props?.plural
                ? 'Attributes'
                : 'Attribute'
            : props?.plural
                ? 'attributes'
                : 'attribute'
        ),
        shift: 'shift',
        tag: (props?: CaseAndNumber) => (props?.cap 
            ? props?.plural
                ? 'Tags'
                : 'Tag'
            : props?.plural
                ? 'tags'
                : 'tag'
        ),
        position: `position`,
        organization: `organization`,
        user: `user`,
        request: (isPlural?: boolean) => (isPlural 
            ? 'requests'
            : 'request'
        ),
        responder: (isPlural?: boolean) => (isPlural 
            ? 'responders'
            : 'responder'
        ),
    },
    visualDelim: '·',
    errorMessages: {
        unknownElement: (element: string) => `Unknown ${element}`,
    },
    responders: (n: number) => (n == 1) ? 'responder' : 'responders',
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
        addElement: (el?: string) => `Add${el ? ' ' + el : ''}`,
        editElement: (el?: string) => `Edit${el ? ' ' + el : ''}`,
        addCategory: (el?: string) => `Add${el ? ' ' + el : ''} category`,
        addAnotherElement: (el?: string) => `Add another ${el}`,
        username: 'Username',
        password: 'Password',
        newPassword: 'New password',
        firstname: 'First Name',
        lastname: 'Last Name',
        email: 'Email',
        invitationCode: 'Invitation code',
        successfullyUpdatedElement: (el?: string) => `Successfully updated ${el}`,
        available: (cap?: boolean) => cap ? `Available` : `available`, 
        unavailable: (cap?: boolean) => cap ? `Unavailable` : `unavailable`, 
        availabilityAlertTitle: `Set your status`,
        availabilityAlertMessage: (onDuty: boolean) => `You are currently ${onDuty ? STRINGS.INTERFACE.available() : STRINGS.INTERFACE.unavailable()}.`, 
    },
    PAGE_TITLES: {
        landing: 'Landing',
        joinOrganization: 'Join Organization',
        invitationSuccessful: 'Invitation Successful',
        createAccount: 'Create Account',
        signIn: 'Sign In',
        updatePassword: 'Set a new password',
        updatePasswordFor: (emailOrName: string) => `Enter a new password for ${emailOrName}`,
        forgotPassword: 'Reset password',
        signUp: 'Sign Up',
        signUpThroughOrg: 'Sign Up',
        userHomePage: 'Home',
        helpRequestList: 'Requests',
        helpRequestMap: 'Requests',
        helpRequestIdWhileLoading: '',
        helpRequestChat: (prefix: string, id: string) => `Channel for ${requestDisplayName(prefix, id)}`,
        teamList: 'Team',
        settings: 'Settings',
        channels: 'Channels',
        componentLibrary: 'Component Library',
        createRequest: 'Create Request',
    },
    REQUESTS: {
        updatedRequestSuccess: (req: string) => `Successfully updated ${req}.`,
        createdRequestSuccess: (req: string) => `Successfully created ${req}.`,
        editRequestTitle: (prefix: string, requestName: string) => `Edit ${requestDisplayName(prefix, requestName)}`,
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
        requestIsClosed: 'This request has been closed.',
        noRespondersDefined: `No responder positions have been defined for this request. Once defined, they will show up here and people will be able to join positions they're qualified for.`,
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
            removeUser: (userName: string) => `${userName} isn't on this position.`,
            removeFromPositionDialogTitle: (userName: string) =>`Remove ${userName}?`,
            removeFromPositionDialogText: (userName: string) => `${userName} will no longer be on this position.`,
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
        },
        errorMessages: {
            positionNotOnRequest: (prefix: string, requestId: string) => `This position doesn't exist for ${prefix + '–' || 'Request '}${requestId}.`,
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
        userNotFound: (email: string) => `No account found with that email and password.`,
        userExists: (email: string) => `User with email ${email} already exists.`,
        wrongPassword: `Password is incorrect`,
        updatePasswordButton: `Set password`,
        forgotPasswordButton: `Send login code`,
        passwordTooShort: `Use at least ${minPasswordLength} characters.`,
        passwordUpdated: 'Successfully updated password.',
        emailProbablyNotRight: `That doesn't look like an email address.`,
        resetPasswordCodeSent: `If we find a matching account, we'll email a link to reset your password.`,
        signInForAPI: `You must be signed in to call this api`,
        noOrgScope: `No org scope supplied`,
        noOrgAccess: `You do not have access to the requested org.`,
        unauthorized: `Unauthorized user`,
        removeDialogTitle: (isMe: boolean) => isMe ? `Leave organization?` : `Remove from organization?`,
        removeDialogText: (isMe: boolean, userName: string) => `${isMe ? 'You' : userName} will need to be reinvited to regain access to this organization.`,
        removeDialogOptionNo: 'Cancel',
        removeDialogOptionYes: (isMe: boolean, userName: string) => isMe ? `Leave organization` : `Remove ${userName}`,
        removeUser: (isMe: boolean) => isMe ? 'Leave organization' : 'Remove from organization',
        notInOrg: (usersNotInOrg: string[], orgName: string) => `Users with ids: ${usersNotInOrg.join(', ')} are not in org: ${orgName}`,
        roleRequired: `You must invite a user with at least one role.`,
        joinOrg: (orgName: string, link: string, existingUser: boolean) => `You have been invited to ${!existingUser ? 'sign up and ' : ''}join ${orgName} on the PATCH App! If you would like to accept this invite, make sure you have PATCH installed and then click the following link to join ${orgName}.\n${link}`,
        alreadyInOrg: (orgName: string) => `You are already a member of ${orgName}!`,
        invitationSuccessful: (email: string, phone: string) => `Invitation sent to email ${email} and phone ${phone}.`,
        inviteNotFound: (userEmail: string, orgName: string) => `Invite for user with email ${userEmail} to join '${orgName}' not found`,
        twilioError: (msg: string) => `Twilio Error: ${msg}`,
        errorMessages: {
            genericError: () => `Something went wrong. Make sure you're online and, if it persists, email ${STRINGS.emailAddresses.help}.`,
            badResetPasswordCode: () => `The link you used is either expired or incorrect. Try sending yourself a new one or email ${STRINGS.emailAddresses.help} for help.`,
            userNotSignedIn: `User no longer signed in`,
            onlyOneOrg: `You can only be a member of one org currently!`,
            alreadyAMember: `User is already a member of the organization`,
            notInOrg: `User is not a member of the organization`,
        },
        
        noPermissionToEditRoles: `You do not have permission to edit Roles associated with your profile.`,
        noPermissionToEditAttributes: `You do not have permission to edit Attributes associated with your profile.`,
        noPermissionToEditUserRoles: `You do not have permission to edit Roles associated with this user's profile.`,
        noPermissionToEditUserAttributes: `You do not have permission to edit Attributes associated with this user's profile.`,
        removedUserSuccess: (name: string) => `Successfully removed ${name} from your organization.`,
        updatedProfileSuccess: (name?: string) => `Successfully updated ${name ? name + `'s` : `your`} profile.`,
    },
    SETTINGS: {
        rolesIntroA: 'Use Roles to specify who does what for a Shift or Request.',
        rolesIntroB: 'Each role grants the permissions needed for that role. A person can be eligible for more than one role.',
        deleteRole: 'Delete this role',
        nameRole: 'Name this role',
        setPermissions: 'Set permissions',
        rolesAndPermissions: 'Roles + permissions',
        cannotEditRole: (roleName: string) => `The ${roleName} role cannot be edited`,
        cannotDeleteRole: (roleName: string) => `The ${roleName} role cannot be deleted`,
        assignedToAll: ' (assigned to all members)',
        removeRoleDialogTitle: (roleName: string) =>`Remove ${roleName} role?`,
        removeRoleDialogText: (roleName: string) => `The ${roleName} role (and its permissions) will be removed from all team members.`,
        removeRoleDialogOptionNo: 'Cancel',
        removeRoleDialogOptionYes:  `Remove`, 
        errorMessages: {
            roleNotInOrg: (roleId: string, organization: string) => `Role  ${roleId} does not exist in organization ${organization}.`,
            attributeCategoryExists: (category: string, organization: string) => `Already an Attribute Category with the name "${category}" in organization ${organization}`,
            unknownAttributeCategory: (category: string, organization: string) => `Unknown Attribute Category with the name "${category}" in organization ${organization}`,
            attributeExistsInCategory: (attribute: string, category: string, organization: string) => `Already an Attribute with the name "${attribute}" in Attribute Category "${category}" in Organization ${organization}`,
            attributeNotInCategory: (attribute: string, category: string) => `Attribute ${attribute} does not exist in Attribute Category ${category}.`,
            unknownAttributeInCategory: (attribute: string, category: string, organization: string) => `Unknown Attribute (${attribute}) in Attribute Category (${category}) in organization (${organization})`,
            tagCategoryExists: (category: string, organization: string) => `Already a Tag Category with the name "${category}" in organization ${organization}`,
            unknownTagCategory: (category: string, organization: string) => `Unknown Tag Category with the name "${category}" in organization ${organization}`,
            tagExistsInCategory: (tag: string, category: string, organization: string) => `Already a Tag with the name "${tag}" in Tag Category "${category}" in Organization ${organization}`,
            tagNotInCategory: (tag: string, category: string) => `Tag ${tag} does not exist in Tag Category ${category}.`,
            unknownTagInCategory: (tag: string, category: string, organization: string) => `Unknown Tag (${tag}) in Tag Category (${category}) in organization (${organization})`
        },
    }
}

export default STRINGS;
