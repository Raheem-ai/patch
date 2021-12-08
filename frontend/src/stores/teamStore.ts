import { makeAutoObservable, runInAction } from 'mobx';
import { getStore, Store } from './meta';
import { ITeamStore, IUserStore } from './interfaces';
import { ClientSideFormat } from '../../../common/api';
import { ProtectedUser, TeamFilter, TeamSortBy } from '../../../common/models';
import { persistent } from '../meta';
import {parseFullName} from 'parse-full-name';

@Store(ITeamStore)
export default class TeamStore implements ITeamStore {

    private userStore = getStore<IUserStore>(IUserStore);

    loading = false;

    @persistent() filter = TeamFilter.Everyone;
    @persistent() sortBy = TeamSortBy.ByLastName;
    
    constructor() {
        makeAutoObservable(this)
    }

    clear() {
        
    }

    get sortedUsers() {
        return Array.from(this.userStore.usersInOrg)
            .filter((user) => {
                switch (this.filter) {
                    case TeamFilter.Everyone:
                        return this.filterEveryone(user)
                    case TeamFilter.OffDuty:
                        return this.filterOffDuty(user)
                    case TeamFilter.OnDuty:
                        return this.filterOnDuty(user)
                }
            })
            .sort((a, b) => {
                switch (this.sortBy) {
                    case TeamSortBy.ByFirstName:
                        return this.sortByFirstName(a, b)
                    case TeamSortBy.ByLastName:
                        return this.sortByLastName(a, b)
                    case TeamSortBy.BySkill:
                        return this.sortBySkill(a, b)
                }
            })
    }

    filterEveryone = (user: ClientSideFormat<ProtectedUser>): boolean => {
        return true;
    }

    filterOffDuty = (user: ClientSideFormat<ProtectedUser>): boolean => {
        return !user.organizations[this.userStore.currentOrgId].onDuty;
    }

    filterOnDuty = (user: ClientSideFormat<ProtectedUser>): boolean => {
        return user.organizations[this.userStore.currentOrgId].onDuty;
    }

    sortByFirstName = (a: ClientSideFormat<ProtectedUser>, b: ClientSideFormat<ProtectedUser>): number => {
        const aFirstName = parseFullName(a.name).first;
        const bFirstName = parseFullName(b.name).first;
        
        return aFirstName == bFirstName
            ? 0
            : aFirstName < bFirstName
                ? -1
                : 1
    }

    sortByLastName = (a: ClientSideFormat<ProtectedUser>, b: ClientSideFormat<ProtectedUser>): number => {
        const aLastName = parseFullName(a.name).last;
        const bLastName = parseFullName(b.name).last;
        
        return aLastName == bLastName
            ? 0
            : aLastName < bLastName
                ? -1
                : 1
    }

    sortBySkill = (a: ClientSideFormat<ProtectedUser>, b: ClientSideFormat<ProtectedUser>): number => {
        const aSkills = a.skills.length;
        const bSkills = b.skills.length;
        
        return aSkills == bSkills
            ? 0
            : aSkills > bSkills
                ? -1
                : 1
    }

    setSortBy = (sortBy: TeamSortBy) => {
        this.sortBy = sortBy;
    }

    setFilter = async (filter: TeamFilter) => {
        runInAction(() => this.filter = filter)
    }

    async refreshUsers() {
        try {
            await this.userStore.updateOrgUsers([])
        } catch (e) {
            console.error(e)
        }
    }
}