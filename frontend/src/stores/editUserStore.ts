import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IEditUserStore, IUserStore, userStore } from './interfaces';
import { CategorizedItem, CategorizedItemUpdates, Me, ProtectedUser } from '../../../common/models';
import { persistent } from '../meta';
import { ClientSideFormat } from '../../../common/api';
import { PhoneNumberRegex } from '../../../common/constants';
import { iHaveAllPermissions } from "../utils";
import { PatchPermissions } from "../../../common/models";

@Store(IEditUserStore)
export default class EditUserStore implements IEditUserStore {

    // null == unedited state
    @persistent() _id = null
    @persistent() _name = null
    @persistent() _phone = null
    @persistent() _email = null
    @persistent() _password = null
    @persistent() _displayColor = null
    @persistent() _race = null
    @persistent() _bio = null
    @persistent() _roles = null
    @persistent() _attributes = null
    @persistent() _pronouns = null

    get id() { 
        return this._id == null ? '' : this._id;
    }

    set id(val) {
        this._id = val
    }

    get name() { 
        return this._name == null ? '' : this._name;
    }

    set name(val) {
        this._name = val
    }

    get phone() { 
        return this._phone == null ? '' : this._phone;
    }

    set phone(val) {
        this._phone = val
    }

    get email() { 
        return this._email == null ? '' : this._email;
    }

    set email(val) {
        this._email = val
    }

    get password() { 
        return this._password == null ? '' : this._password;
    }

    set password(val) {
        this._password = val
    }

    get displayColor() { 
        return this._displayColor == null ? '' : this._displayColor;
    }

    set displayColor(val) {
        this._displayColor = val
    }

    get race() { 
        return this._race == null ? '' : this._race;
    }

    set race(val) {
        this._race = val
    }

    get bio() { 
        return this._bio == null ? '' : this._bio;
    }

    set bio(val) {
        this._bio = val
    }

    get roles(): string[] { 
        return this._roles == null ? [] : this._roles;
    }

    set roles(val) {
        this._roles = val
    }

    get attributes(): CategorizedItem[] { 
        return this._attributes == null ? [] : this._attributes;
    }

    set attributes(val) {
        this._attributes = val
    }

    get pronouns() { 
        return this._pronouns == null ? '' : this._pronouns;
    }

    set pronouns(val) {
        this._pronouns = val
    }


    constructor() {
        makeAutoObservable(this)
    }

    clear = () => {
        this._id = null
        this._name = null
        this._phone = null
        this._email = null
        this._password = null
        this._displayColor = null
        this._race = null
        this._bio = null
        this._roles = null
        this._attributes = null
        this._pronouns = null
    }

    loadMe(user: Me) {
        this.id = user.id
        this.name = user.name || null
        this.phone = user.phone || null
        this.email = user.email || null
        this.displayColor = user.displayColor || null
        this.race = user.race || null
        this.bio = user.bio || null
        this.pronouns = user.pronouns || null

        this.roles = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.roleIds || null
        this.attributes = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.attributes || null
    }
    
    loadUser(user: ClientSideFormat<ProtectedUser>) {
        this.id = user.id
        this.name = user.name || null
        this.phone = user.phone || null
        this.email = user.email || null
        this.displayColor = user.displayColor || null
        this.bio = user.bio || null
        this.pronouns = user.pronouns || null

        this.roles = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.roleIds || null
        this.attributes = userStore().users.get(user.id)?.organizations[userStore().currentOrgId]?.attributes || null
    }

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
        return this.attributesValid &&
            this.rolesValid
    }

    get nameValid(){
        return this._name == null || !!this.name.length
    }

    get phoneValid(){
        return this._phone == null || this.phone.length == 10 || PhoneNumberRegex.test(this.phone)
    }

    get emailValid(){
        return this._email == null || this.email.includes('@')
    }

    get passwordValid(){
        return true
    }

    get displayColorValid(){
        return true
    }

    get raceValid(){
        return true
    }

    get bioValid(){
        return true
    }

    get rolesValid(){
        return true
    }

    get attributesValid(){
        return true
    }

    get pronounsValid(){
        return true
    }

    editUser = async () => {
        return await userStore().editUser(this.id, {
            roleIds: this.roles,
            attributes: this.attributes
        })
    }

    editMe = async () => {
        const canEditAttributes = iHaveAllPermissions([PatchPermissions.AssignAttributes]);
        const canEditRoles = iHaveAllPermissions([PatchPermissions.AssignRoles]);

        return await userStore().editMe({
            name: this._name == null ? undefined : this.name,
            email: this._email == null ? undefined : this.email,
            phone: this._phone == null ? undefined : this.phone,
            displayColor: this._displayColor == null ? undefined : this.displayColor,
            race: this._race == null ? undefined : this.race,
            pronouns: this._pronouns == null ? undefined : this.pronouns,
            bio: this._bio == null ? undefined : this.bio
        },
        {
            roleIds: (!canEditRoles || this._roles == null) ? undefined : this.roles,
            attributes: (!canEditAttributes || this._attributes == null) ? undefined : this.attributes
        })
    }

    onRoleDeletedUpdate(roleId: string) {
        const idx = this.roles.indexOf(roleId);

        if (idx != -1) {
            this.roles.splice(idx, 1)
        }
    }
}