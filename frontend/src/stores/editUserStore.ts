import { makeAutoObservable, runInAction } from 'mobx';
import { getStore, Store } from './meta';
import { ILinkingStore, IEditUserStore, IUserStore } from './interfaces';
import * as Linking from 'expo-linking'
import { LinkExperience, LinkParams, Me, ProtectedUser } from '../../../common/models';
import { navigateTo, navigationRef } from '../navigation';
import { routerNames } from '../types';
import { persistent } from '../meta';
import { ClientSideFormat } from '../../../common/api';

@Store(IEditUserStore)
export default class EditUserStore implements IEditUserStore {

    userStore = getStore<IUserStore>(IUserStore);

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
    @persistent() pronouns = ''


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
        this.pronouns = ''
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

        this.roles = this.userStore.users.get(user.id)?.organizations[this.userStore.currentOrgId]?.roles || []
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

        this.roles = this.userStore.users.get(user.id)?.organizations[this.userStore.currentOrgId]?.roles || []
    }

    editUser = async () => {
        // TODO: add roles to this
        return await this.userStore.editUser(this.id, {
            skills: this.skills,

        })
    }

    editMe = async () => {
        return await this.userStore.editMe({
            name: this.name || undefined,
            email: this.email || undefined,
            phone: this.phone || undefined,
            displayColor: this.displayColor || undefined,
            race: this.race || undefined,
            pronouns: this.pronouns || undefined,
            bio: this.bio || undefined,
        })
    }
   
}