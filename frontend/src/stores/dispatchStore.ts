import { makeAutoObservable, ObservableSet, runInAction } from 'mobx';
import { Store } from './meta';
import { IDispatchStore, organizationStore, requestStore, userStore } from './interfaces';
import { OrgContext } from '../../../common/api';
import { persistent } from '../meta';
import { api } from '../services/interfaces';
import { DefaultRoleIds, EligibilityOption, StatusOption } from '../../../common/models';

@Store(IDispatchStore)
export default class DispatchStore implements IDispatchStore {

    @persistent() selectAll = false;

    @persistent() roleOption: string = DefaultRoleIds.Anyone
    @persistent() statusOption: StatusOption = StatusOption.Any
    @persistent() eligibilityOption: EligibilityOption = EligibilityOption.Everyone

    statusOptions = [StatusOption.Any, StatusOption.Available]
    eligibilityOptions = [EligibilityOption.Everyone, EligibilityOption.Eligible]

    selectedResponderIds = new ObservableSet<string>()

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init()
        await requestStore().init()
        await organizationStore().init()
    }

    orgContext(): OrgContext {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    get roleOptions() {
        const roleIds = new Set<string>()

        roleIds.add(DefaultRoleIds.Anyone)

        requestStore().currentRequest?.positions.forEach(pos => {
            roleIds.add(pos.role)
        })

        return Array.from(roleIds.values())
    }

    get assignableResponders() {
        return userStore().usersInOrg.filter(user => {
            const orgConfig = user.organizations[userStore().currentOrgId];

            const hasRole = this.roleOption == DefaultRoleIds.Anyone
                ? true
                : (orgConfig?.roleIds || []).includes(this.roleOption);
            
            const correctStatus = this.statusOption == StatusOption.Any
                ? true
                : !!orgConfig?.onDuty

            let satisfiesEligibility = this.eligibilityOption == EligibilityOption.Everyone
                ? true
                : false;
                
            if (this.eligibilityOption == EligibilityOption.Eligible) {
                const metadata = requestStore().getRequestMetadata(user.id, requestStore().currentRequestId)
                
                if (metadata) {
                    satisfiesEligibility = Array.from(metadata.positions.values()).some(pos => {
                        return pos.canJoin && !pos.joinedUsers.has(user.id)
                    })
                }
            } 

            return hasRole && correctStatus && satisfiesEligibility
        })
    }

    get selectedResponders() {
        return Array.from(this.selectedResponderIds.values()).map(id => userStore().users.get(id));
    }

    async toggleSelectAll() {
        this.selectAll = !this.selectAll;

        if (this.selectAll) {
            this.assignableResponders.forEach(r => this.selectedResponderIds.add(r.id))
        } else {
            this.assignableResponders.forEach(r => this.selectedResponderIds.delete(r.id))
        }
    }

    async toggleResponder(userId: string) {
        if (!this.selectAll) {
            if (this.selectedResponderIds.has(userId)) {
                this.selectedResponderIds.delete(userId)
            } else {
                this.selectedResponderIds.add(userId)
            }
        } else {
            this.selectedResponderIds.delete(userId)
        }
        this.checkSelectAll();
    }

    async assignRequest(requestId: string, responderIds: string[]) {
        try {
            const updatedReq = await api().notifyRespondersAboutRequest(this.orgContext(), requestId, responderIds)

            runInAction(() => {
                requestStore().updateOrAddReq(updatedReq)
            })
        } catch (e) {
            console.error(e);
        }
    }

    checkSelectAll = () => {
        if (this.assignableResponders.length == 0 || !this.assignableResponders.every(r => this.selectedResponderIds.has(r.id))) {
            this.selectAll = false;
        } else {
            this.selectAll = true;
        }
    }

    setRoleOption = (roleId: string) => {
        this.roleOption = roleId;
        this.checkSelectAll();
    }

    setStatusOption = (statusOpt: StatusOption) => {
        this.statusOption = statusOpt;
        this.checkSelectAll();
    }

    setEligibilityOption = (eOpt: EligibilityOption) => {
        this.eligibilityOption = eOpt;
        this.checkSelectAll();
    }

    // TODO: move text to strings file

    roleOptionToHeaderLabel = (roleId: string) => {
        return roleId == DefaultRoleIds.Anyone
            ? 'Any role'
            : organizationStore().roles.get(roleId)?.name
    }

    statusOptionToHeaderLabel = (statusOpt: StatusOption) => {
        return statusOpt == StatusOption.Any
            ? 'Any status'
            : statusOpt == StatusOption.Available
                ? 'Available'
                : ''
    }

    eligibilityOptionToHeaderLabel = (eOpt: EligibilityOption) => {
        return eOpt == EligibilityOption.Everyone
            ? 'Everyone'
            : eOpt == EligibilityOption.Eligible
                ? 'Eligible'
                : ''
    }

    roleOptionToOptionLabel = (roleId: string) => {
        return this.roleOptionToHeaderLabel(roleId)
    }

    statusOptionToOptionLabel = (statusOpt: StatusOption) => {
        return this.statusOptionToHeaderLabel(statusOpt)
    }

    eligibilityOptionToOptionLabel = (eOpt: EligibilityOption) => {
        return this.eligibilityOptionToHeaderLabel(eOpt)
    }

    clear() {
        this.selectedResponderIds.clear()
    }
}