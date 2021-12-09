import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { navigateTo } from "../../../navigation";
import { IBottomDrawerStore, ILinkingStore, IEditUserStore, IUserStore } from "../../../stores/interfaces";
import { getStore } from "../../../stores/meta";
import { routerNames, ScreenProps } from "../../../types";
import { FormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";


@observer
export default class EditUser extends React.Component {
    userStore = getStore<IUserStore>(IUserStore);
    linkingStore = getStore<ILinkingStore>(ILinkingStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    editUserStore = getStore<IEditUserStore>(IEditUserStore);

    static submit = {
        action: async () => {
            const editUserStore = getStore<IEditUserStore>(IEditUserStore);
            const userStore = getStore<IUserStore>(IUserStore);
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

            const updated = await (editUserStore.id == userStore.user.id 
                ? editUserStore.editMe()
                : editUserStore.editUser());

            if (updated) {
                bottomDrawerStore.hide();
            }
        },
        label: () => {
            return `Save`
        }
    }

    static onHide = () => {
        const editUserStore = getStore<IEditUserStore>(IEditUserStore);
        editUserStore.clear();
    }

    formProps = (): FormProps => {
        const editingMe = this.editUserStore.id == this.userStore.user.id;

        return {
            headerLabel: editingMe
                ? 'Edit my profile'
                : `Edit ${this.editUserStore.name}'s profile'`, 
            onExpand: () => {
                this.bottomDrawerStore.hideHeader();
            },
            onBack: () => {
                this.bottomDrawerStore.showHeader();
            },
            inputs: editingMe
                ? this.editMeInputs()
                : this.editUserInputs()
        }
    }

    editUserInputs(): [
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TagList'>,
        FormInputConfig<'TagList'>,
    ] {
        return [
            {
                onChange: (name) => this.editUserStore.name = name,
                val: () => {
                    return this.editUserStore.name
                },
                name: 'name',
                previewLabel: () => this.editUserStore.name,
                headerLabel: () => 'Name',
                type: 'TextInput',
                disabled: true
            },
            {
                onChange: (email) => this.editUserStore.email = email,
                val: () => {
                    return this.editUserStore.email
                },
                name: 'email',
                previewLabel: () => this.editUserStore.email,
                headerLabel: () => 'Email',
                type: 'TextInput',
                disabled: true
            },
            {
                onChange: (phone) => this.editUserStore.phone = phone,
                val: () => {
                    return this.editUserStore.phone
                },
                name: 'phone',
                previewLabel: () => this.editUserStore.phone,
                headerLabel: () => 'Phone',
                type: 'TextInput',
                disabled: true
            },
            {
                onSave: (roles) => this.editUserStore.roles = roles,
                val: () => {
                    return this.editUserStore.roles
                },
                name: 'roles',
                previewLabel: () => null,
                headerLabel: () => 'Roles',
                type: 'TagList',
                // tTODO: remove when we update roles here too
                disabled: true,
                props: {
                    options: allEnumValues(UserRole),
                    optionToLabel: (opt) => UserRoleToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        this.editUserStore.roles.splice(idx, 1)
                    },
                },
            },
            {
                onSave: (skills) => this.editUserStore.skills = skills,
                val: () => {
                    return this.editUserStore.skills
                },
                name: 'skills',
                previewLabel: () => null,
                headerLabel: () => 'Skills',
                type: 'TagList',
                props: {
                    options: allEnumValues(RequestSkill),
                    optionToLabel: (opt) => RequestSkillToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        this.editUserStore.skills.splice(idx, 1)
                    },
                    dark: true
                },
            }
        ]
    }

    editMeInputs(): [
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TagList'>,
        FormInputConfig<'TagList'>,
        FormInputConfig<'TextInput'>, 
        FormInputConfig<'TextArea'>
    ] {
        return [
            {
                onChange: (name) => this.editUserStore.name = name,
                val: () => {
                    return this.editUserStore.name
                },
                name: 'name',
                previewLabel: () => this.editUserStore.name,
                headerLabel: () => 'Name',
                type: 'TextInput',
            },
            {
                onChange: (email) => this.editUserStore.email = email,
                val: () => {
                    return this.editUserStore.email
                },
                name: 'email',
                previewLabel: () => this.editUserStore.email,
                headerLabel: () => 'Email',
                type: 'TextInput',
                // TODO: remove when we have logic for changing email
                disabled: true
            },
            {
                onChange: (phone) => this.editUserStore.phone = phone,
                val: () => {
                    return this.editUserStore.phone
                },
                name: 'phone',
                previewLabel: () => this.editUserStore.phone,
                headerLabel: () => 'Phone',
                type: 'TextInput',
            },
            {
                onSave: (roles) => this.editUserStore.roles = roles,
                val: () => {
                    return this.editUserStore.roles
                },
                name: 'roles',
                previewLabel: () => null,
                headerLabel: () => 'Roles',
                type: 'TagList',
                // tTODO: remove when we update roles here too
                disabled: true,
                props: {
                    options: allEnumValues(UserRole),
                    optionToLabel: (opt) => UserRoleToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        this.editUserStore.roles.splice(idx, 1)
                    },
                },
            },
            {
                onSave: (skills) => this.editUserStore.skills = skills,
                val: () => {
                    return this.editUserStore.skills
                },
                name: 'skills',
                previewLabel: () => null,
                headerLabel: () => 'Skills',
                type: 'TagList',
                disabled: true,
                props: {
                    options: allEnumValues(RequestSkill),
                    optionToLabel: (opt) => RequestSkillToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        this.editUserStore.skills.splice(idx, 1)
                    },
                    dark: true
                },
            },
            {
                onChange: (pronouns) => this.editUserStore.pronouns = pronouns,
                val: () => {
                    return this.editUserStore.pronouns
                },
                name: 'pronouns',
                previewLabel: () => this.editUserStore.pronouns,
                headerLabel: () => 'Pronouns',
                type: 'TextInput',
            },
            {
                onSave: (bio) => this.editUserStore.bio = bio,
                val: () => {
                    return this.editUserStore.bio
                },
                name: 'bio',
                previewLabel: () => this.editUserStore.bio,
                headerLabel: () => 'Bio',
                type: 'TextArea',
            },
        ]
    }

    render() {
        return (
            <BottomDrawerViewVisualArea>
                <Form {...this.formProps()}/>
            </BottomDrawerViewVisualArea>
        )
    }
                
}


const styles = StyleSheet.create({
    
})