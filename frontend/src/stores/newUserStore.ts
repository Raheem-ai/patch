import { makeAutoObservable, runInAction } from 'mobx';
import { Store } from './meta';
import { ILinkingStore, INewUserStore, IUserStore, linkingStore, userStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';
import { PhoneNumberRegex } from '../../../common/constants';

@Store(INewUserStore)
export default class NewUserStore implements INewUserStore {

    @persistent() name = ''
    @persistent() phone = ''
    @persistent() email = ''
    @persistent() password = ''
    @persistent() displayColor = ''
    @persistent() race? = ''
    @persistent() bio? = ''
    @persistent() roles = []
    @persistent() roleIds = []
    @persistent() attributes = []
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
        this.roles = []
        this.roleIds = []
        this.attributes = []
        this.pronouns = ''
    }

    // this should use the required param instead of being hard coded
    // removed && this.rolesValid
    get isValid() {
        return this.phoneValid &&
            this.emailValid 
    }

    // TO DO: real phone validation, e.g. using 
    // twilio lookup API: https://www.twilio.com/docs/lookup/api
    // or Google's libphonenumber: https://www.npmjs.com/package/libphonenumber-js
    get phoneValid(){
        return this.phone.length == 10 || PhoneNumberRegex.test(this.phone)
    }

    get emailValid(){
        return this.email.includes('@')
    }

    get rolesValid(){
        return !!this.roles.length
    }

    get roleIDsValid() {
        return !!this.roleIds.length
    }

    inviteNewUser = async () => {
        return await userStore().inviteUserToOrg(
            this.email,
            this.phone,
            this.roleIds,
            this.attributes,
            linkingStore().baseUrl
        );
    }
}