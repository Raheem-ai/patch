import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { alertStore, ILinkingStore, linkingStore, navigationStore, userStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { resolveErrorMessage } from '../errors';
import Branch, { BranchSubscriptionEvent } from 'react-native-branch';

@Store(ILinkingStore)
export default class LinkingStore implements ILinkingStore {
    initialRoute = null;
    initialRouteParams = null;

    constructor() {
        makeAutoObservable(this)
    }

    init = async () => {
        //make sure login is settled so linking handlers have access to that info
        await userStore().init();
        await alertStore().init();
        
        /**
         * TODO: might need to make LinkExperienceDef.run() be async and
         * do some async shenanigans to 
         * await the call to handle link for ones that require async 
         * setup...branch handles when we are opened with a link 
         * immediately but gives us no way to check if we need to wait or not
         * something like a 
         * 
         * let initialLinkSetup = null
         * 
         * Branch.subscribe(e => {
         *   initialLinkSetup = this.handleLink(...)
         * })
         * 
         * await sleep(0)
         * 
         * if (initialLinkSetup) {
         *    await initialLinkSetup
         * }
         * 
         */
        Branch.subscribe((event: BranchSubscriptionEvent) => {
            if (event 
                && event.params 
                && !event.error 
                && event.params['+clicked_branch_link'] 
                && event.uri
            ) {
                this.handleBranchLink(event)
            }
        })
    }

    handleBranchLink = (event: BranchSubscriptionEvent) => {
        const { queryParams } = Linking.parse(event.params['~referring_link'] || '');
        
        const { exp, ...params } = queryParams || {};

        if (!!exp && LinkConfig[exp]) {
            LinkConfig[exp as LinkExperience].run(params || {});
        } else {
            // TODO: should this have a default view for this to route to?
            alertStore().toastError(`Sorry we don't recognize that link. Please make sure it is correct.`, true, true)
        }
    }

    call = async (number: string) => {
        const url = `tel:${number}`;
        
        Linking.canOpenURL(url) && await Linking.openURL(url)
    }

    mailTo = async (email: string) => {
        const url = `mailto:${email}`;
        
        Linking.canOpenURL(url) && await Linking.openURL(url)
    }

    clear() {
        
    }
   
}

// Note: each experience should validate its data before navigating to 
// the associated screen
type LinkExperienceDef<Exp extends LinkExperience> = {
    run: (params: LinkParams[Exp]) => void
}

type LinkExperiences = {
    [exp in LinkExperience]: LinkExperienceDef<exp>
}

const LinkConfig: LinkExperiences = {
    [LinkExperience.SignUpThroughOrganization]: {
        run: (params) => {
            if (!(params.email && params.orgId && params.pendingId)) {
                alertStore().toastError(`The link you clicked to sign up through an org is invalid. Make sure it is correct.`, true, true);
                return
            }

            if (!navigationRef.current) {
                runInAction(() => {
                    linkingStore().initialRoute = routerNames.signUpThroughOrg;
                    linkingStore().initialRouteParams = params;
                })
            } else {
                navigateTo(routerNames.signUpThroughOrg, params)
            }
        }
    },
    [LinkExperience.JoinOrganization]: {
        run: (params) => {
            if (!(params.email && params.orgId && params.pendingId)) {
                alertStore().toastError(`The link you clicked to join an org is invalid. Make sure it is correct.`, true, true);
                return
            }

            // TODO: flesh out this flow when user already exists
            // NOTE: this requires us to have the concept of multiple orgs in the app
            // or at least the concept of users who don't belong to an org
            if (!navigationRef.current) {
                runInAction(() => {
                    linkingStore().initialRoute = routerNames.signUpThroughOrg;
                    linkingStore().initialRouteParams = params;
                })
            } else {
                navigateTo(routerNames.signUpThroughOrg, params)
            }
        }
    },
    [LinkExperience.ResetPassword]: {
        run: async (params) => {
            try {
                await userStore().signInWithCode(params.code);
            } catch(e) {
                alertStore().toastError(resolveErrorMessage(e), true, true);
                return
            }

            runInAction(() => userStore().passwordResetLoginCode = params.code);

            if (!navigationRef.current) {
                runInAction(() => {
                    linkingStore().initialRoute = routerNames.updatePassword;
                })
            } else if (navigationStore().currentRoute != routerNames.updatePassword) {
                navigateTo(routerNames.updatePassword)
            }
        }
    }
}