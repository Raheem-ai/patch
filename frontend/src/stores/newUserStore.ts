import { makeAutoObservable, runInAction } from 'mobx';
import { getStore, Store } from './meta';
import { ILinkingStore, INewUserStore, IUserStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';

@Store(INewUserStore)
export default class NewUserStore implements INewUserStore {

    userStore = getStore<IUserStore>(IUserStore);
    linkingStore = getStore<ILinkingStore>(ILinkingStore);

    @persistent() name = ''
    @persistent() phone = ''
    @persistent() email = ''
    @persistent() password = ''
    @persistent() displayColor = ''
    @persistent() race? = ''
    @persistent() bio? = ''
    @persistent() skills = []
    @persistent() roles = []
    @persistent() pronouns? = []


    constructor() {
        makeAutoObservable(this)
    }

    clear = () => {
        this.name = ''
        this.phone = ''
        this.email = ''
        this.password = ''
        this.displayColor = ''
        this.race = ''
        this.bio = ''
        this.skills = []
        this.roles = []
        this.pronouns = []
    }

    inviteNewUser = async () => {
        await this.userStore.inviteUserToOrg(
            this.email, 
            this.phone, 
            this.roles, 
            this.linkingStore.baseUrl
        );
    }
   
}