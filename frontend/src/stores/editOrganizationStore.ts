import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { EditOrganizationData, IEditOrganizationStore, userStore, organizationStore } from './interfaces';
import { PatchPermissions, Role, MinRole, AttributeCategory, TagCategory, MinAttributeCategory, MinTagCategory, OrganizationMetadata, Attribute, MinAttribute, Tag, MinTag } from '../../../common/models';
import { OrgContext, RoleContext } from '../../../common/api';
import { api } from '../services/interfaces';

@Store(IEditOrganizationStore)
export default class EditOrganizationStore implements IEditOrganizationStore  {
    // Organization Metadata
    name: string = '';
    roleDefinitions: Role[] = []
    attributeCategories: AttributeCategory[] = []
    tagCategories: TagCategory[] = []

    // Edit Attribute Category
    currentAttributeCategoryName: string = ''
    currentAttributeCategoryAttributes: Attribute[] = []

    // Edit Attribute
    currentAttributeName: string = ''

    // Edit Tag Category
    currentTagCategoryName: string = ''
    currentTagCategoryTags: Tag[] = []

    // Edit Tag
    currentTagName: string = ''

    constructor() {
        makeAutoObservable(this)
    }

    orgContext = (): OrgContext => {
        return {
            token: userStore().authToken,
            orgId: userStore().currentOrgId
        }
    }

    roleContext(roleId: string): RoleContext {
        return {
            roleId,
            ...this.orgContext()
        }
    }

    async editOrganization(orgId: string) {
        const orgMetadata = {
            id: orgId,
            roleDefinitions: this.roleDefinitions
        }

        try {
            const updatedOrg = await api().editOrgMetadata(this.orgContext(), orgMetadata);
            organizationStore().updateOrgData(updatedOrg);
            return updatedOrg;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteRoles(roleIds: string[]) {
        return await api().deleteRoles(this.orgContext(), roleIds);
    }

    async createNewAttributeCategory(): Promise<AttributeCategory> {
        const category: MinAttributeCategory = {
            name: this.currentAttributeCategoryName
        }

        try {
            const createdCategory = await api().createNewAttributeCategory(this.orgContext(), category);
            organizationStore().updateOrAddAttributeCategory(createdCategory);
            return createdCategory;
        } catch (e) {
            console.error(e);
        }
    }

    async editAttributeCategory(categoryId: string): Promise<AttributeCategory> {
        const category: AttributeCategory = {
            id: categoryId,
            name: this.currentAttributeCategoryName,
            attributes: this.currentAttributeCategoryAttributes
        }

        try {
            const updatedCategory = await api().editAttributeCategory(this.orgContext(), category);
            organizationStore().updateOrAddAttributeCategory(updatedCategory);
            return updatedCategory;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteAttributeCategory(categoryId: string): Promise<OrganizationMetadata> {
        return await api().deleteAttributeCategory(this.orgContext(), categoryId);
    }

    async createNewAttribute(categoryId: string): Promise<Attribute> {
        const attribute: MinAttribute = {
            name: this.currentAttributeName
        }

        try {
            const createdAttribute = await api().createNewAttribute(this.orgContext(), categoryId, attribute);
            organizationStore().updateOrAddAttribute(categoryId, createdAttribute);
            return createdAttribute;
        } catch (e) {
            console.error(e);
        }
    }

    async editAttribute(categoryId: string, attributeId: string): Promise<Attribute> {
        const attribute: Attribute = {
            id: attributeId,
            name: this.currentAttributeName
        }

        try {
            const updatedAttribute = await api().editAttribute(this.orgContext(), categoryId, attribute);
            organizationStore().updateOrAddAttribute(categoryId, updatedAttribute);
            return updatedAttribute;
        } catch (e) {
            console.error(e);
        }
    }

    async createNewTagCategory(): Promise<TagCategory> {
        const category: MinTagCategory = {
            name: this.currentTagCategoryName
        }

        try {
            const createdCategory = await api().createNewTagCategory(this.orgContext(), category);
            organizationStore().updateOrAddTagCategory(createdCategory);
            return createdCategory;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteAttribute(categoryId: string, attributeId: string): Promise<OrganizationMetadata> {
        return await api().deleteAttribute(this.orgContext(), categoryId, attributeId);
    }

    async editTagCategory(categoryId: string): Promise<TagCategory> {
        const category: TagCategory = {
            id: categoryId,
            name: this.currentTagCategoryName,
            tags: this.currentTagCategoryTags
        }

        try {
            const updatedCategory = await api().editTagCategory(this.orgContext(), category);
            organizationStore().updateOrAddTagCategory(updatedCategory);
            return updatedCategory;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteTagCategory(categoryId: string): Promise<OrganizationMetadata> {
        return await api().deleteTagCategory(this.orgContext(), categoryId);
    }

    async createNewTag(categoryId: string): Promise<Tag> {
        const tag: MinTag = {
            name: this.currentTagName
        }

        try {
            const createdTag = await api().createNewTag(this.orgContext(), categoryId, tag);
            organizationStore().updateOrAddTag(categoryId, createdTag);
            return createdTag;
        } catch (e) {
            console.error(e);
        }
    }

    async editTag(categoryId: string, tagId: string): Promise<Tag> {
        const tag: Tag = {
            id: tagId,
            name: this.currentTagName,
        }

        try {
            const updatedTag = await api().editTag(this.orgContext(), categoryId, tag);
            organizationStore().updateOrAddTag(categoryId, updatedTag);
            return updatedTag;
        } catch (e) {
            console.error(e);
        }
    }

    async deleteTag(categoryId: string, tagId: string): Promise<OrganizationMetadata> {
        return await api().deleteTag(this.orgContext(), categoryId, tagId);
    }

    loadOrg(org: EditOrganizationData) {
        this.name = org.name;
        this.roleDefinitions = org.roleDefinitions;
        this.attributeCategories = org.attributeCategories;
        this.tagCategories = org.tagCategories;
    }

    clear() {
        this.name = '';
        this.roleDefinitions = [];
        this.attributeCategories = [];
        this.tagCategories = [];

        this.currentAttributeCategoryName = '';
        this.currentAttributeCategoryAttributes = [];

        this.currentAttributeName = '';

        this.currentTagCategoryName = '';
        this.currentTagCategoryTags = [];

        this.currentTagName = '';
    }
}