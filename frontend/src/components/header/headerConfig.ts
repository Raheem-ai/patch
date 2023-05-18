import { PatchPermissions, RequestStatus, UserRole } from "../../../../common/models"
import { navigateTo, navigationRef } from "../../navigation"
import { bottomDrawerStore, BottomDrawerView, createShiftStore, editRequestStore, editUserStore, IBottomDrawerStore, IEditUserStore, ILinkingStore, IRequestStore, IUserStore, organizationStore, requestStore, userStore } from "../../stores/interfaces"
import TestIds from "../../test/ids"
import { ICONS, RootStackParamList, routerNames } from "../../types"
import { iHaveAllPermissions, iHaveAnyPermissions } from "../../utils"
import STRINGS from "../../../../common/strings"

export type IHeaderAction = {
    icon: string,
    callback: () => void,
    // TODO: make this mandatory when we get each screen instrumented
    testId?: string
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
        title: STRINGS.PAGE_TITLES.userHomePage
    },
    [routerNames.landing]: {
        title: STRINGS.PAGE_TITLES.landing,
        unauthenticated: true
    },
    [routerNames.joinOrganization]: {
        title: STRINGS.PAGE_TITLES.joinOrganization,
        unauthenticated: true
    },
    [routerNames.invitationSuccessful]: {
        title: STRINGS.PAGE_TITLES.invitationSuccessful,
        unauthenticated: true
    },
    [routerNames.createAccount]: {
        title: STRINGS.PAGE_TITLES.createAccount,
        unauthenticated: true
    },
    [routerNames.signIn]: {
        title: STRINGS.PAGE_TITLES.signIn,
        unauthenticated: true
    },
    // updatePassword marked as unauthenticated because we don't want the header on the view
    [routerNames.updatePassword]: {
        title: STRINGS.PAGE_TITLES.updatePassword,
        unauthenticated: true
    },
    [routerNames.sendResetCode]: {
        title: STRINGS.PAGE_TITLES.forgotPassword,
        unauthenticated: true
    },
    [routerNames.signUp]: {
        title: STRINGS.PAGE_TITLES.signUp,
        unauthenticated: true
    },
    [routerNames.signUpThroughOrg]: {
        title: STRINGS.PAGE_TITLES.signUpThroughOrg,
        unauthenticated: true
    },
    [routerNames.userHomePage]: {
        title: () => {
            // TODO: get org name for here
            const oName = organizationStore().metadata.name;
            const orgName = oName !== undefined
                ? oName
                : STRINGS.PAGE_TITLES.userHomePage
            return orgName
        }
    },
    [routerNames.helpRequestList]: {
        title: STRINGS.PAGE_TITLES.helpRequestList,
        rightActions: [{
            testId: TestIds.header.actions.goToHelpRequestMap,
            icon: ICONS.map,
            callback: () => navigateTo(routerNames.helpRequestMap)
        }, {
            testId: TestIds.header.actions.createRequest,
            icon: ICONS.add,
            callback: () => {
                bottomDrawerStore().show(BottomDrawerView.createRequest, true);
            }
        }]
    },
    [routerNames.helpRequestMap]: {
        title: STRINGS.PAGE_TITLES.helpRequestMap,
        rightActions: [{
            testId: TestIds.header.actions.goToHelpRequestList,
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
                ? STRINGS.PAGE_TITLES.helpRequestIdWhileLoading
                // if coming from a notification, current request may not be set
                // yet so make sure we don't throw trying to access it
                : requestStore().currentRequest?.displayId;

            return STRINGS.REQUESTS.requestDisplayName(prefix(), id)
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

            return STRINGS.PAGE_TITLES.helpRequestChat(prefix(), req.displayId)
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
                    testId: TestIds.header.actions.addTeamMember,
                    icon: ICONS.add,
                    callback: async () => {
                        bottomDrawerStore().show(BottomDrawerView.inviteUserToOrg, true);
                    }
                }
            ]
            : [];
        
        return {
            title: STRINGS.PAGE_TITLES.teamList,
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
                    testId: TestIds.header.actions.editProfile,
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
    [routerNames.calendar]: {
        title: STRINGS.PAGE_TITLES.calendar,
        rightActions: [
            {
                testId: TestIds.header.actions.createShift,
                icon: ICONS.add,
                callback: () => {
                    createShiftStore().setStartDate();
                    bottomDrawerStore().show(BottomDrawerView.createShift, true);
                }
            }
        ]
    },
    [routerNames.componentLib]: {
        title: STRINGS.PAGE_TITLES.componentLibrary
    }, 
    [routerNames.settings]: {
        title: STRINGS.PAGE_TITLES.settings
    },
    [routerNames.helpAndInfo]: {
        title: STRINGS.PAGE_TITLES.helpAndInfo
    },
    [routerNames.chats]: {
        title: STRINGS.PAGE_TITLES.channels
    }
}

export default HeaderConfig;
