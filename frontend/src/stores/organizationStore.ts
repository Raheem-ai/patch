import { makeAutoObservable, runInAction, when } from 'mobx';
import { Store } from './meta';
import { IOrganizationStore, userStore } from './interfaces';
import { api } from '../services/interfaces';
import { Attribute, AttributeCategory, MinRole, OrganizationMetadata, Role, Tag, TagCategory } from '../../../common/models';
import { OrgContext } from '../../../common/api';

@Store(IOrganizationStore)
export default class OrganizationStore implements IOrganizationStore {
    metadata: OrganizationMetadata = {
        id: '',
        name: '',
        roleDefinitions: [],
        attributeCategories: [],
        tagCategories: []
    };

    constructor() {
        makeAutoObservable(this)
    }

    async init() {
        await userStore().init();
        if (userStore().signedIn) {
            await this.getOrgData();
        } else {
            when(() => userStore().signedIn, this.getOrgData)
        }
    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
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

    updateOrgData = (updatedOrg: OrganizationMetadata): void => {
        runInAction(() => {
            this.metadata = {
                id: updatedOrg.id,
                name: updatedOrg.name,
                roleDefinitions: updatedOrg.roleDefinitions,
                attributeCategories: updatedOrg.attributeCategories,
                tagCategories: updatedOrg.tagCategories
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
        this.metadata = null;
    }
}