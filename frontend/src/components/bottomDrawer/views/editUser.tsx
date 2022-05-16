import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PatchPermissions, RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigateTo } from "../../../navigation";
import { IBottomDrawerStore, ILinkingStore, IEditUserStore, IUserStore, IAlertStore, editUserStore, userStore, alertStore, bottomDrawerStore, organizationStore } from "../../../stores/interfaces";
import { routerNames, ScreenProps } from "../../../types";
import { iHaveAllPermissions } from "../../../utils";
import { AttributesListInput } from "../../forms/inputs/defaults/defaultAttributeListInputConfig";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";


@observer
export default class EditUser extends React.Component {
    static submit = {
        isValid: () => {
            const onMyProfile = editUserStore().id == userStore().user.id;

            return onMyProfile
                ? editUserStore().myChangesValid
                : editUserStore().userChangesValid
        },
        action: async () => {
            const onMyProfile = editUserStore().id == userStore().user.id;

            try {
                await (onMyProfile
                    ? editUserStore().editMe()
                    : editUserStore().editUser());
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
                return   
            }

            const successMsg = onMyProfile
                ? 'Successfully updated your profile.'
                : `Successfully updated ${editUserStore().name}'s profile.`

            alertStore().toastSuccess(successMsg)

            bottomDrawerStore().hide();
        },
        label: () => {
            return `Save`
        }
    }

    static onHide = () => {
        editUserStore().clear();
    }

    formProps = (): FormProps => {
        const editingMe = editUserStore().id == userStore().user.id;

        return {
            headerLabel: editingMe
                ? 'Edit my profile'
                : `Edit ${editUserStore().name}'s profile'`, 
            onExpand: () => {
                bottomDrawerStore().hideHeader();
            },
            onBack: () => {
                bottomDrawerStore().showHeader();
            },
            inputs: editingMe
                ? this.editMeInputs()
                : this.editUserInputs()
        }
    }

    onItemDeleted = (index: number) => {
        if (index != -1) {
            const updatedSelection = editUserStore().roles.slice()
            updatedSelection.splice(index, 1);
            editUserStore().roles = updatedSelection;
        }
    }

    editUserInputs = () => {
        const canEditAttributes = iHaveAllPermissions([PatchPermissions.AssignAttributes]);
        const canEditRoles = iHaveAllPermissions([PatchPermissions.AssignRoles]);
        const inputs = [
            {
                onChange: (name) => editUserStore().name = name,
                val: () => {
                    return editUserStore().name
                },
                isValid: () => {
                    return editUserStore().nameValid
                },
                name: 'name',
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                disabled: true
            } as InlineFormInputConfig<'TextInput'>,
            {
                onChange: (email) => editUserStore().email = email,
                val: () => {
                    return editUserStore().email
                },
                isValid: () => {
                    return editUserStore().emailValid
                },
                name: 'email',
                placeholderLabel: () => 'Email',
                type: 'TextInput',
                disabled: true
            } as InlineFormInputConfig<'TextInput'>,
            {
                onChange: (phone) => editUserStore().phone = phone,
                val: () => {
                    return editUserStore().phone
                },
                isValid: () => {
                    return editUserStore().phoneValid
                },
                name: 'phone',
                placeholderLabel: () => 'Phone',
                type: 'TextInput',
                disabled: true
            } as InlineFormInputConfig<'TextInput'>,
            // TODO: prevent display entirely or disable?
            canEditRoles
            ? {
                val: () => editUserStore().roles,
                onSave: (roles) => {
                    editUserStore().roles = roles
                },
                isValid: () => {
                    return editUserStore().rolesValid
                },
                headerLabel: 'Roles',
                placeholderLabel: 'Roles',
                previewLabel: () => editUserStore().roles.map(roleId => {
                        return organizationStore().roles.get(roleId)?.name
                    }).join(),
                name: 'roles',
                type: 'RoleList',
                icon: 'key',
                disabled: false,
                props: {
                    multiSelect: true,
                    onItemDeleted: (idx) => this.onItemDeleted(idx)
                },
            } as ScreenFormInputConfig<'RoleList'>
            : null,
        canEditAttributes
        ? AttributesListInput({
            val: () => editUserStore().attributes,
            onSave: (attributes) => { 
                editUserStore().attributes = attributes;
            },
            isValid: () => true,
            name: 'attributes'
        }) as ScreenFormInputConfig<'CategorizedItemList'>
        : null
        ].filter(v => !!v);

        return inputs;
    }
    editMeInputs = () => {
        const canEditAttributes = iHaveAllPermissions([PatchPermissions.AssignAttributes]);
        const canEditRoles = iHaveAllPermissions([PatchPermissions.AssignRoles]);
        const inputs = [
            {
                onChange: (name) => editUserStore().name = name,
                val: () => {
                    return editUserStore().name
                },
                isValid: () => {
                    return editUserStore().nameValid
                },
                name: 'name',
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                icon: 'account',
            } as InlineFormInputConfig<'TextInput'>,
            {
                onSave: (bio) => editUserStore().bio = bio,
                val: () => {
                    return editUserStore().bio
                },
                isValid: () => {
                    return editUserStore().bioValid
                },
                name: 'bio',
                previewLabel: () => editUserStore().bio,
                headerLabel: () => 'Bio',
                placeholderLabel: () => 'Bio',
                type: 'TextArea',
            } as ScreenFormInputConfig<'TextArea'>,
            {
                onChange: (pronouns) => editUserStore().pronouns = pronouns,
                val: () => {
                    return editUserStore().pronouns
                },
                isValid: () => {
                    return editUserStore().pronounsValid
                },
                name: 'pronouns',
                placeholderLabel: () => 'Pronouns',
                type: 'TextInput',
            } as InlineFormInputConfig<'TextInput'>,,
            {
                onChange: (phone) => editUserStore().phone = phone,
                val: () => {
                    return editUserStore().phone
                },
                isValid: () => {
                    return editUserStore().phoneValid
                },
                name: 'phone',
                placeholderLabel: () => 'Phone',
                type: 'TextInput',
                icon: 'clipboard-account',
                required: true
            } as InlineFormInputConfig<'TextInput'>,,
            {
                onChange: (email) => editUserStore().email = email,
                val: () => {
                    return editUserStore().email
                },
                isValid: () => {
                    return editUserStore().emailValid
                },
                name: 'email',
                placeholderLabel: () => 'Email',
                type: 'TextInput',
                // TODO: remove when we have logic for changing email
                disabled: true
            } as InlineFormInputConfig<'TextInput'>,
            // TODO: prevent display entirely or disable?
            canEditRoles
                ? {
                    val: () => editUserStore().roles,
                    onSave: (roles) => {
                        editUserStore().roles = roles
                    },
                    isValid: () => editUserStore().rolesValid,
                    headerLabel: 'Roles',
                    placeholderLabel: 'Roles',
                    previewLabel: () => editUserStore().roles.map(roleId => {
                            return organizationStore().roles.get(roleId)?.name
                        }).join(),
                    name: 'roles',
                    type: 'RoleList',
                    icon: 'key',
                    disabled: false,
                    props: {
                        multiSelect: true,
                        onItemDeleted: (idx) => this.onItemDeleted(idx)
                    },
                } as ScreenFormInputConfig<'RoleList'>
                : null,
            canEditAttributes
            ? AttributesListInput({
                val: () => editUserStore().attributes,
                onSave: (attributes) => { 
                    editUserStore().attributes = attributes;
                },
                isValid: () => true,
                name: 'attributes'
            }) as ScreenFormInputConfig<'CategorizedItemList'>
            : null
        ].filter(v => !!v);

        return inputs;
    }

    render() {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <BottomDrawerViewVisualArea>
                    <Form {...this.formProps()}/>
                </BottomDrawerViewVisualArea>
            </KeyboardAvoidingView>
        )
    }
                
}


const styles = StyleSheet.create({
    
})