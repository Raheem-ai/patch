import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { alertStore, ILinkingStore, linkingStore, navigationStore, userStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { resolveErrorMessage } from '../errors';

@Store(ILinkingStore)
export default class LinkingStore implements ILinkingStore {
    initialRoute = null;
    initialRouteParams = null;

    constructor() {
        makeAutoObservable(this)
    }

    get baseUrl() {
        return Linking.createURL('');
    }

    init = async () => {
        //make sure login is settled so linking handlers have access to that info
        await userStore().init();

        Linking.addEventListener('url', this.handleLink)

        // for linking from background
        const url = await Linking.getInitialURL()

        if (url) {
            this.handleLink({ url });
        }
    }

    handleLink = ({ url }: { url: string }) => {
        const { path, queryParams } = Linking.parse(url);
        
        if (LinkConfig[path]) {
            LinkConfig[path as LinkExperience].run(queryParams);
        } else {
            // TODO: old or bad link
            // should have a default view for this to route to
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

type LinkExperienceDef<Exp extends LinkExperience> = {
    run: (params: LinkParams[Exp]) => void
}

type LinkExperiences = {
    [exp in LinkExperience]: LinkExperienceDef<exp>
}

const LinkConfig: LinkExperiences = {
    [LinkExperience.SignUpThroughOrganization]: {
        run: (params) => {
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

            runInAction(() => userStore().userResettingPasswordWithCode = params.code);

            if (!navigationRef.current) {
                runInAction(() => {
                    linkingStore().initialRoute = routerNames.updatePassword;
                    linkingStore().initialRouteParams = params;
                })
            } else if (navigationStore().currentRoute != routerNames.updatePassword) {
                navigateTo(routerNames.updatePassword)
            }
        }
    }
}