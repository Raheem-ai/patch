import { UserRole } from "../../../../common/models"
import { navigateTo, navigationRef } from "../../navigation"
import { bottomDrawerStore, BottomDrawerView, editUserStore, IBottomDrawerStore, IEditUserStore, ILinkingStore, IRequestStore, IUserStore, requestStore, userStore } from "../../stores/interfaces"
import { RootStackParamList, routerNames } from "../../types"

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

const HeaderConfig: {
    [route in keyof RootStackParamList]: HeaderRouteConfig | (() => HeaderRouteConfig)
 } = {
    [routerNames.home]: {
        title: 'Home'
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
            return 'Home'
        }
    },
    [routerNames.helpRequestList]: {
        title: 'Requests',
        rightActions: [{
            icon: 'map',
            callback: () => navigateTo(routerNames.helpRequestMap)
        }, {
            icon: 'plus',
            callback: () => {
                bottomDrawerStore().show(BottomDrawerView.createRequest, true);
            }
        }]
    },
    [routerNames.helpRequestMap]: {
        title: 'Requests',
        rightActions: [{
            icon: 'view-list',
            callback: () => navigateTo(routerNames.helpRequestList)
        }, {
            icon: 'plus',
            callback: () => {
                bottomDrawerStore().show(BottomDrawerView.createRequest, true);
            }
        }]
    },
    [routerNames.helpRequestDetails]: {
        title: () => {
            const id = requestStore().loading
                ? ''
                : requestStore().currentRequest.displayId;

            return `Request ${id}`
        },
        leftActions: [{
            icon: 'chevron-left',
            callback: () => {
                requestStore().tryPopRequest();
                navigationRef.current.goBack();
            }
        }]
    },
    [routerNames.helpRequestChat]: {
        title: () => {
            const req = requestStore().currentRequest;
            return `Chat for Request ${req.displayId}`
        },
        leftActions: [{
            icon: 'chevron-left',
            callback: () => {
                navigationRef.current.goBack();

                // setTimeout(() => {
                //     const requestStoreInst() = getStore<IRequestStore>(IRequestStore);
                //     requestStoreInst().currentRequest = null;
                // }, 0)
            }
        }]
    },
    [routerNames.teamList]: () => {
        
        const rightActions = userStore().isAdmin
            ? [
                {
                    icon: 'plus',
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
        
        // I'm looking at myself
        const rightActions = !userStore().loadingCurrentUser && (onMyProfile || userStore().isAdmin)
            ? [
                {
                    icon: 'pencil',
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
                ? 'My profile'
                : 'User profile',
            leftActions: [{
                icon: 'chevron-left',
                callback: () => {
                    navigationRef.current.goBack();
                }
            }],
            rightActions 
        }
    }
}

export default HeaderConfig;
