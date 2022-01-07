import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { ILinkingStore, INewUserStore, IUserStore, linkingStore, userStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';

@Store(INewUserStore)
export default class NewUserStore implements INewUserStore {

    @persistent() name = ''
    @persistent() phone = ''
    @persistent() email = ''
    @persistent() password = ''
    @persistent() displayColor = ''
    @persistent() race? = ''
    @persistent() bio? = ''
    @persistent() skills = []
    @persistent() roles = []
    @persistent() pronouns? = ''


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
        this.pronouns = ''
    }

    get isValid() {
        return this.phoneValid &&
            this.emailValid &&
            this.skillsValid &&
            this.rolesValid
    }

    get phoneValid(){
        return this.phone.length == 10
    }

    get emailValid(){
        return this.email.includes('@')
    }

    get skillsValid(){
        return true
        // return !!this.skills.length
    }

    get rolesValid(){
        // return true
        return !!this.roles.length
    }

    inviteNewUser = async () => {
        return await userStore().inviteUserToOrg(
            this.email, 
            this.phone, 
            this.roles, 
            this.skills,
            linkingStore().baseUrl
        );
    }
}