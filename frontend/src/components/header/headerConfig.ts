import { navigateTo, navigationRef } from "../../navigation"
import { IRequestStore } from "../../stores/interfaces"
import { getStore } from "../../stores/meta"
import { RootStackParamList, routerNames } from "../../types"

export type IHeaderAction = {
    icon: string,
    callback: () => void
}

export type HeaderRouteConfig = {
    title: string | (() => string),
    leftActions?: IHeaderAction[],
    rightActions?: IHeaderAction[]
}

const HeaderConfig: {
    [route in keyof RootStackParamList]: HeaderRouteConfig
 } = {
    [routerNames.home]: {
        title: 'Home'
    },
    [routerNames.signIn]: {
        title: 'Sign In'
    },
    [routerNames.signUp]: {
        title: 'Sign Up'
    },
    [routerNames.userHomePage]: {
        title: 'User Home Page'
    },
    [routerNames.createHelpRequest]: {
        title: 'Requests'
    },
    [routerNames.helpRequestList]: {
        title: 'Requests',
        rightActions: [{
            icon: 'map',
            callback: () => navigateTo(routerNames.helpRequestMap)
        }, {
            icon: 'plus',
            callback: () => navigateTo(routerNames.createHelpRequest)
        }]
    },
    [routerNames.helpRequestMap]: {
        title: 'Requests',
        rightActions: [{
            icon: 'view-list',
            callback: () => navigateTo(routerNames.helpRequestList)
        }, {
            icon: 'plus',
            callback: () => navigateTo(routerNames.createHelpRequest)
        }]
    },
    [routerNames.helpRequestDetails]: {
        title: () => {
            const requestStore = getStore<IRequestStore>(IRequestStore);
            const req = requestStore.currentRequest;
            return `Request ${req.displayId}`
        },
        leftActions: [{
            icon: 'chevron-left',
            callback: () => {
                navigationRef.current.goBack();
            }
        }]
    },
    [routerNames.helpRequestChat]: {
        title: () => {
            const requestStore = getStore<IRequestStore>(IRequestStore);
            const req = requestStore.currentRequest;
            return `Chat for Request ${req.displayId}`
        },
        leftActions: [{
            icon: 'chevron-left',
            callback: () => {
                navigationRef.current.goBack();

                // setTimeout(() => {
                //     const requestStore = getStore<IRequestStore>(IRequestStore);
                //     requestStore.currentRequest = null;
                // }, 0)
            }
        }]
    }
}

export default HeaderConfig;
