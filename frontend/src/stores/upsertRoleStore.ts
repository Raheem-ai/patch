import { makeAutoObservable } from "mobx"
import { OrgContext } from "../../../common/api"
import { Role } from "../../../common/models"
import { api } from "../services/interfaces"
import { IUpsertRoleStore, organizationStore, requestStore, userStore } from "./interfaces"
import { Store } from "./meta"

@Store(IUpsertRoleStore)
export default class UpsertRoleStore implements IUpsertRoleStore  {
    id = ''
    name = ''
    permissionGroups = []

    constructor () {
        makeAutoObservable(this)
    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    create = async () => {
        const newRole = await api().createNewRole(this.orgContext(), {
            name: this.name,
            permissionGroups: this.permissionGroups
        })

        organizationStore().updateOrAddRole(newRole);
    }

    update = async () => {
        const updatedRole = await api().editRole(this.orgContext(), {
            id: this.id,
            name: this.name,
            permissionGroups: this.permissionGroups
        })

        organizationStore().updateOrAddRole(updatedRole);
    }

    delete = async () => {
        if (this.id) {
            const { updatedUserIds, updatedRequestIds } = await api().deleteRoles(this.orgContext(), [this.id])
            console.log('deleted roles')

            if (updatedRequestIds.length) {
                console.log('updating requests', updatedRequestIds)
                await requestStore().getRequests(updatedRequestIds)
            }


            if (updatedUserIds.length) {
                console.log('updating users', updatedUserIds)
                await userStore().updateOrgUsers(updatedUserIds)
            }

            console.log('getting org data')
            await organizationStore().getOrgData();
        }
    }

    save = async () => {
        if (this.id) {
            await this.update()
        } else {
            await this.create()
        }
        
        await organizationStore().getOrgData();
        this.clear()
    }

    nameIsValid = () => {
        return !!this.name && !!this.name.length;
    }

    loadRole = (role: Role) => {
        this.id = role.id
        this.name = role.name
        this.permissionGroups = role.permissionGroups
    }

    clear = () => {
        this.id = ''
        this.name = ''
        this.permissionGroups = []
    }
}