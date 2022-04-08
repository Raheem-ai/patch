import { makeAutoObservable } from "mobx"
import { OrgContext } from "../../../common/api"
import { Role } from "../../../common/models"
import { resolveErrorMessage } from "../errors"
import { api } from "../services/interfaces"
import { alertStore, IUpsertRoleStore, organizationStore, userStore } from "./interfaces"
import { Store } from "./meta"

@Store(IUpsertRoleStore)
export default class UpsertRoleStore implements IUpsertRoleStore  {
    id = ''
    name = ''
    permissions = []

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
            permissions: this.permissions
        })

        organizationStore().updateOrAddRole(newRole);
    }

    update = async () => {
        const updatedRole = await api().editRole(this.orgContext(), {
            id: this.id,
            name: this.name,
            permissions: this.permissions
        })

        organizationStore().updateOrAddRole(updatedRole);
    }

    save = async () => {
        if (this.id) {
            await this.update()
        } else {
            await this.create()
        }
        
        this.clear()
    }

    nameIsValid = () => {
        return !!this.name && !!this.name.length;
    }

    loadRole = (role: Role) => {
        this.id = role.id
        this.name = role.name
        this.permissions = role.permissions
    }

    clear = () => {
        this.id = ''
        this.name = ''
        this.permissions = []
    }
}