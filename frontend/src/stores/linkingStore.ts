import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { ILinkingStore, IUserStore, linkingStore, userStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';

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
            console.log(params)
            // TODO: flush out this flow when user already exists
            // NOTE: this requires us to have the concept of multiple orgs in the app
        }
    }
}