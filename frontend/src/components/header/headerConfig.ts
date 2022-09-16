import { PatchPermissions, RequestStatus, UserRole } from "../../../../common/models"
import { navigateTo, navigationRef } from "../../navigation"
import { bottomDrawerStore, BottomDrawerView, editUserStore, IBottomDrawerStore, IEditUserStore, ILinkingStore, IRequestStore, IUserStore, organizationStore, requestStore, userStore } from "../../stores/interfaces"
import { ICONS, RootStackParamList, routerNames } from "../../types"
import { iHaveAllPermissions, iHaveAnyPermissions } from "../../utils"
import { requestDisplayName } from "../../../../common/utils/requestUtils"
import STRINGS from "../../../../common/strings"

export type IHeaderAction = {
    icon: string,
    callback: () => void
}

export type HeaderRouteConfig = {
    title: string | (() => string),
    leftActions?: IHeaderAction[],
    rightActions?: IHeaderAction[]
    unauthenticated?: boolean
}

const prefix = () => {
    return organizationStore().metadata.requestPrefix;
}

const HeaderConfig: {
    [route in keyof RootStackParamList]: HeaderRouteConfig | (() => HeaderRouteConfig)
 } = {
    [routerNames.home]: {
        title: 'Home'
    },
    [routerNames.landing]: {
        title: 'Landing',
        unauthenticated: true
    },
    [routerNames.joinOrganization]: {
        title: 'Join Organization',
        unauthenticated: true
    },
    [routerNames.invitationSuccessful]: {
        title: 'Invitation Successful',
        unauthenticated: true
    },
    [routerNames.createAccount]: {
        title: 'Create Account',
        unauthenticated: true
    },
    [routerNames.signIn]: {
        title: 'Sign In',
        unauthenticated: true
    },
    [routerNames.signUp]: {
        title: 'Sign Up',
        unauthenticated: true
    },
    [routerNames.signUpThroughOrg]: {
        title: 'Sign Up',
        unauthenticated: true
    },
    [routerNames.userHomePage]: {
        title: () => {
            // TODO: get org name for here
            const oName = organizationStore().metadata.name;
            const orgName = oName !== undefined
                ? oName //.slice(0,Math.min(16, oName.length)) + '…'
                : 'Home'
            return orgName
        }
    },
    [routerNames.helpRequestList]: {
        title: 'Requests',
        rightActions: [{
            icon: ICONS.map,
            callback: () => navigateTo(routerNames.helpRequestMap)
        }, {
            icon: ICONS.add,
            callback: () => {
                bottomDrawerStore().show(BottomDrawerView.createRequest, true);
            }
        }]
    },
    [routerNames.helpRequestMap]: {
        title: 'Requests',
        rightActions: [{
            icon: ICONS.cardList,
            callback: () => navigateTo(routerNames.helpRequestList)
        }, {
            icon: ICONS.add,
            callback: () => {
                bottomDrawerStore().show(BottomDrawerView.createRequest, true);
            }
        }]
    },
    [routerNames.helpRequestDetails]: () => {   
        const title = () => {
            // loading is needed for switching between two different requests on the same
            // request details screen
            const id = requestStore().loading
                ? ''
                // if coming from a notification, current request may not be set
                // yet so make sure we don't throw trying to access it
                : requestStore().currentRequest?.displayId;

            return `${requestDisplayName(prefix(), id)}`
        };

        const leftActions = [{
            icon: ICONS.navBack,
            callback: () => {
                requestStore().tryPopRequest();
                navigationRef.current.goBack();
            }
        }]

        const rightActions = iHaveAllPermissions([PatchPermissions.EditRequestData]) && requestStore().currentRequest?.status != RequestStatus.Closed
            ? [
                {
                    icon: ICONS.edit,
                    callback: async () => {
                        bottomDrawerStore().show(BottomDrawerView.editRequest, true);
                    }
                }
            ]
            : [];
        
        return {
            title,
            leftActions,
            rightActions 
        }
    },
    [routerNames.helpRequestChat]: {
        title: () => {
            const req = requestStore().currentRequest;

            return `Channel for ${requestDisplayName(prefix(), req.displayId)}`
        },
        leftActions: [{
            icon: ICONS.navBack,
            callback: () => {
                navigationRef.current.goBack();

                // setTimeout(() => {
                //     const requestStoreInst() = getStore<IRequestStore>(IRequestStore);
                //     requestStoreInst().currentRequest = null;
                // }, 0)
            }
        }],
        rightActions: [{
            icon: ICONS.request,
            callback: () => navigateTo(routerNames.helpRequestDetails)
        }],
    },
    [routerNames.teamList]: () => {        
        const rightActions = iHaveAllPermissions([PatchPermissions.InviteToOrg])
            ? [
                {
                    icon: ICONS.add,
                    callback: async () => {
                        bottomDrawerStore().show(BottomDrawerView.inviteUserToOrg, true);
                    }
                }
            ]
            : [];
        
        return {
            title: 'Team',
            rightActions 
        }
    },
    [routerNames.userDetails]: () => {
        const onMyProfile = userStore().user.id == userStore().currentUser?.id;
        const canEditProfile = onMyProfile || iHaveAnyPermissions([PatchPermissions.AssignAttributes, PatchPermissions.AssignRoles]);

        // I'm looking at myself
        const rightActions = canEditProfile && !userStore().loadingCurrentUser
            ? [
                {
                    icon: ICONS.edit,
                    callback: async () => {
                        if (onMyProfile) {
                            editUserStore().loadMe(userStore().user);
                            bottomDrawerStore().show(BottomDrawerView.editMe, true);
                        } else {
                            editUserStore().loadUser(userStore().currentUser);
                            bottomDrawerStore().show(BottomDrawerView.editUser, true);
                        }
                    }
                }
            ]
            : [];
        
        return {
            title: onMyProfile 
                ? STRINGS.ACCOUNT.profileTitleMine
                : STRINGS.ACCOUNT.profileTitle,
            leftActions: [{
                icon: ICONS.navBack,
                callback: () => {
                    navigationRef.current.goBack();
                }
            }],
            rightActions 
        }
    },
    [routerNames.componentLib]: {
        title: 'Component Library'
    }, 
    [routerNames.settings]: {
        title: 'Settings'
    },
    [routerNames.chats]: {
        title: 'Channels'
    }
}

export default HeaderConfig;
