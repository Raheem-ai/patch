import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { INewUserStore, userStore } from './interfaces';
import { persistent } from '../meta';
import { PhoneNumberRegex } from '../../../common/constants';
import { linkBaseUrl } from '../config';
import { CategorizedItem, CategorizedItemUpdates } from '../../models';

@Store(INewUserStore)
export default class NewUserStore implements INewUserStore {

    @persistent() name = ''
    @persistent() phone = ''
    @persistent() email = ''
    @persistent() password = ''
    @persistent() displayColor = ''
    @persistent() race? = ''
    @persistent() bio? = ''
    @persistent() roleIds: string[] = []
    @persistent() attributes: CategorizedItem[] = []
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

    get roleIDsValid() {
        return !!this.roleIds.length
    }

    inviteNewUser = async () => {
        return await userStore().inviteUserToOrg(
            this.email,
            this.phone,
            this.roleIds,
            this.attributes,
            linkBaseUrl
        );
    }

    onRoleDeletedUpdate(roleId: string) {
        const idx = this.roleIds.indexOf(roleId);

        if (idx != -1) {
            this.roleIds.splice(idx, 1)
        }
    }
}