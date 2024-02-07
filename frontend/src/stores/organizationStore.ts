import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { Attribute, AttributeCategory, MinRole, OrganizationMetadata, PatchPermissions, Role, Tag, TagCategory } from '../../../common/front';
import { OrgContext } from '../../../common/api';
import { resolvePermissionsFromRoles } from '../../../common/utils/permissionUtils';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    metadata: OrganizationMetadata = {
        id: '',
        name: '',
        roleDefinitions: [],
        attributeCategories: [],
        tagCategories: [],
        requestPrefix: ''
    };

    get isReady() {
        return userStore().signedIn && (userStore().currentOrgId == this.metadata?.id)
    }

    get roles()  {
        const roleMapping = new Map<string, Role>()

        this.metadata.roleDefinitions.forEach(def => {
            roleMapping.set(def.id, def);
        })

        return roleMapping
    }

    get userRoles() {
        const map = new Map<string, Role[]>();

        userStore().usersInOrg.forEach(u => {
            const roleIds = u.organizations[userStore().currentOrgId].roleIds;
            const userRoles: Role[] = [];

            roleIds.forEach(id => {
                if (this.roles.has(id)) {
                    userRoles.push(this.roles.get(id))
                }
            })

            map.set(u.id, userRoles)
        })

        return map;
    }

    get userPermissions () {
        const mapping = new Map<string, Set<PatchPermissions>>();

        this.userRoles.forEach((roles, userId) => {
            mapping.set(userId, resolvePermissionsFromRoles(roles))
        })

        return mapping
    }

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();

        if (userStore().signedIn) {
            await this.getOrgDataAfterSignin();
        } else {
            when(() => userStore().signedIn, this.getOrgDataAfterSignin)
        }
    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    getOrgDataAfterSignin = async () => {
        await this.getOrgData()

        when(() => !userStore().signedIn, () => {
            when(() => userStore().signedIn, this.getOrgDataAfterSignin)
        })
    }

    getOrgData = async () => {
        try {
            const data = await api().getOrgMetadata(this.orgContext());
            runInAction(() => {
                this.metadata = data;
            })
        } catch (e) {
            console.error(e);
        }
    }

    updateOrgData = (updatedOrg: Partial<OrganizationMetadata>): void => {
        runInAction(() => {
            this.metadata = {
                id: updatedOrg.id || this.metadata.id,
                name: updatedOrg.name || this.metadata.name,
                roleDefinitions: updatedOrg.roleDefinitions || this.metadata.roleDefinitions,
                attributeCategories: updatedOrg.attributeCategories || this.metadata.attributeCategories,
                tagCategories: updatedOrg.tagCategories || this.metadata.tagCategories,
                requestPrefix: updatedOrg.requestPrefix || this.metadata.requestPrefix
            }
        });
    }

    updateOrAddRole(updatedRole: Role) {
        let index = this.metadata.roleDefinitions.findIndex(
            roleDef => roleDef.id == updatedRole.id
        );

        runInAction(() => {
            if (index >= 0) {
                this.metadata.roleDefinitions[index] = updatedRole;
            } else {
                this.metadata.roleDefinitions.push(updatedRole);
            }

            // TODO: prolly should remove metadata object and put props on store for 
            // consistency + when we have multiple orgs to keep track of
            this.metadata = Object.assign({}, this.metadata)
        });
    }

    updateOrAddAttributeCategory(updatedCategory: AttributeCategory) {
        let index = this.metadata.attributeCategories.findIndex(
            category => category.id == updatedCategory.id
        );

        runInAction(() => {
            if (index >= 0) {
                this.metadata.attributeCategories[index] = updatedCategory;
            } else {
                this.metadata.attributeCategories.push(updatedCategory);
            }
        });
    }

    updateOrAddAttribute(categoryId: string, updatedAttribute: Attribute) {
        let index = this.metadata.attributeCategories.findIndex(
            category => category.id == categoryId
        );

        if (index >= 0) {
            let attrIndex = this.metadata.attributeCategories[index].attributes.findIndex(
                attr => attr.id == updatedAttribute.id
            );

            runInAction(() => {
                // TODO: Will this trigger a re-render bc this is observable or is the update too deep in the object?
                if (attrIndex >= 0) {
                    this.metadata.attributeCategories[index].attributes[attrIndex] = updatedAttribute;
                } else {
                    this.metadata.attributeCategories[index].attributes.push(updatedAttribute);
                }
            });
        }

        // TODO: Can we throw an error or warning here?
    }

    updateOrAddTagCategory(updatedCategory: TagCategory) {
        let index = this.metadata.tagCategories.findIndex(
            category => category.id == updatedCategory.id
        );

        runInAction(() => {
            if (index >= 0) {
                this.metadata.tagCategories[index] = updatedCategory;
            } else {
                this.metadata.tagCategories.push(updatedCategory);
            }
        });
    }

    updateOrAddTag(categoryId: string, updatedTag: Tag) {
        let index = this.metadata.tagCategories.findIndex(
            category => category.id == categoryId
        );

        if (index >= 0) {
            let tagIndex = this.metadata.tagCategories[index].tags.findIndex(
                tag => tag.id == updatedTag.id
            );

            runInAction(() => {
                // TODO: Will this trigger a re-render bc this is observable or is the update too deep in the object?
                if (tagIndex >= 0) {
                    this.metadata.tagCategories[index].tags[tagIndex] = updatedTag;
                } else {
                    this.metadata.tagCategories[index].tags.push(updatedTag);
                }
            });
        }

        // TODO: Can we throw an error or warning here?
    }

    clear() {
        this.metadata = {
            id: '',
            name: '',
            roleDefinitions: [],
            attributeCategories: [],
            tagCategories: [],
            requestPrefix: ''
        };
    }
}