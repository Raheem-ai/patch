import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IEditUserStore, IUserStore, userStore } from './interfaces';
import { Me, ProtectedUser } from '../../../common/models';
import { persistent } from '../meta';
import { ClientSideFormat } from '../../../common/api';

@Store(IEditUserStore)
export default class EditUserStore implements IEditUserStore {

    @persistent() id = ''

    @persistent() name = ''
    @persistent() phone = ''
    @persistent() email = ''
    @persistent() password = ''
    @persistent() displayColor = ''
    @persistent() race = ''
    @persistent() bio = ''
    @persistent() skills = []
    @persistent() roles = []
    @persistent() attributes = []
    @persistent() pronouns = ''

    @persistent() oldMe: Me = null;
    @persistent() oldUser: ClientSideFormat<ProtectedUser> = null;

    constructor() {
        makeAutoObservable(this)
    }

    clear = () => {
        this.id = ''
        this.name = ''
        this.phone = ''
        this.email = ''
        this.password = ''
        this.displayColor = ''
        this.race = ''
        this.bio = ''
        this.skills = []
        this.roles = []
        this.attributes = []
        this.pronouns = ''
        this.oldMe = null
        this.oldUser = null
    }

    loadMe(user: Me) {
        this.id = user.id
        this.name = user.name || ''
        this.phone = user.phone || ''
        this.email = user.email || ''
        this.displayColor = user.displayColor || ''
        this.race = user.race || ''
        this.bio = user.bio || ''
        this.skills = user.skills || []
        this.pronouns = user.pronouns || ''

        this.roles = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.roleIds || []
        this.attributes = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.attributes || []

        this.oldMe = user
    }
    
    loadUser(user: ClientSideFormat<ProtectedUser>) {
        this.id = user.id
        this.name = user.name || ''
        this.phone = user.phone || ''
        this.email = user.email || ''
        this.displayColor = user.displayColor || ''
        this.bio = user.bio || ''
        this.skills = user.skills || []
        this.pronouns = user.pronouns || ''

        this.roles = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.roleIds || []
        this.attributes = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.attributes || []

        this.oldUser = user
    }

    // TODO we need the concept of touched/dirty here
    get myChangesValid() {
        return this.nameValid &&
            this.emailValid &&
            this.phoneValid &&
            this.displayColorValid &&
            this.raceValid &&
            this.pronounsValid &&
            this.bioValid &&
            this.rolesValid &&
            this.attributesValid
    }

    get userChangesValid() {
        return this.skillsValid 
    }

    get nameValid(){
        return !!this.name.length
    }

    get phoneValid(){
        return this.phone.length == 10
    }

    get emailValid(){
        return this.email.includes('@')
    }

    get passwordValid(){
        // return !!this.password.length
        return true
    }

    get displayColorValid(){
        // return !!this.displayColor.length
        return true
    }

    get raceValid(){
        // return !!this.race.length
        return true
    }

    get bioValid(){
        // return !!this.bio.length
        return true
    }

    get skillsValid(){
        return true
        // return !!this.skills.length
    }

    get rolesValid(){
        return true
        // return !!this.roles.length
    }

    get attributesValid(){
        return true
        // return !!this.attributes.length
    }

    get pronounsValid(){
        // return !!this.pronouns.length
        return true
    }

    editUser = async () => {
        return await userStore().editUser(this.id, {
            roleIds: this.roles,
            attributes: this.attributes
        })
    }

    editMe = async () => {
        return await userStore().editMe({
            name: this.name || undefined,
            email: this.email || undefined,
            phone: this.phone || undefined,
            displayColor: this.displayColor || undefined,
            race: this.race || undefined,
            pronouns: this.pronouns || undefined,
            bio: this.bio || undefined
        },
        {
            roleIds: this.roles || undefined,
            attributes: this.attributes || undefined
        })
    }
}