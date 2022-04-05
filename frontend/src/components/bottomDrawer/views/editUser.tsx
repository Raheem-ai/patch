import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigateTo } from "../../../navigation";
import { IBottomDrawerStore, ILinkingStore, IEditUserStore, IUserStore, IAlertStore, editUserStore, userStore, alertStore, bottomDrawerStore } from "../../../stores/interfaces";
import { routerNames, ScreenProps } from "../../../types";
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

    editUserInputs(): [
        InlineFormInputConfig<'TextInput'>, 
        InlineFormInputConfig<'TextInput'>, 
        InlineFormInputConfig<'TextInput'>, 
        ScreenFormInputConfig<'TagList'>,
        ScreenFormInputConfig<'TagList'>,
    ] {
        return [
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
            },
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
            },
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
            },
            {
                onSave: (roles) => editUserStore().roles = roles,
                val: () => {
                    return editUserStore().roles
                },
                isValid: () => {
                    return editUserStore().rolesValid
                },
                name: 'roles',
                previewLabel: () => null,
                headerLabel: () => 'Roles',
                type: 'TagList',
                // tTODO: remove when we update roles here too
                disabled: true,
                props: {
                    options: allEnumValues(UserRole),
                    optionToPreviewLabel: (opt) => UserRoleToLabelMap[opt],
                    optionToListLabel: (opt) => UserRoleToInfoLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        editUserStore().roles.splice(idx, 1)
                    },
                },
            },
            {
                onSave: (skills) => editUserStore().skills = skills,
                val: () => {
                    return editUserStore().skills
                },
                isValid: () => {
                    return editUserStore().skillsValid
                },
                name: 'skills',
                previewLabel: () => null,
                headerLabel: () => 'Skills',
                type: 'TagList',
                props: {
                    options: allEnumValues(RequestSkill),
                    optionToPreviewLabel: (opt) => RequestSkillToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        editUserStore().skills.splice(idx, 1)
                    },
                    dark: true
                },
            }
        ]
    }

    editMeInputs(): [
        InlineFormInputConfig<'TextInput'>, 
        InlineFormInputConfig<'TextInput'>, 
        InlineFormInputConfig<'TextInput'>, 
        ScreenFormInputConfig<'TagList'>,
        ScreenFormInputConfig<'TagList'>,
        InlineFormInputConfig<'TextInput'>, 
        ScreenFormInputConfig<'TextArea'>
    ] {
        return [
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
            },
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
            },
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
                required: true
            },
            {
                onSave: (roles) => editUserStore().roles = roles,
                val: () => {
                    return editUserStore().roles
                },
                isValid: () => {
                    return editUserStore().rolesValid
                },
                name: 'roles',
                previewLabel: () => null,
                headerLabel: () => 'Roles',
                type: 'TagList',
                // TODO: remove when we update roles here too
                disabled: true,
                props: {
                    options: allEnumValues(UserRole),
                    optionToPreviewLabel: (opt) => UserRoleToLabelMap[opt],
                    optionToListLabel: (opt) => UserRoleToInfoLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        editUserStore().roles.splice(idx, 1)
                    },
                },
            },
            {
                onSave: (skills) => editUserStore().skills = skills,
                val: () => {
                    return editUserStore().skills
                },
                isValid: () => {
                    return editUserStore().skillsValid
                },
                name: 'skills',
                previewLabel: () => null,
                headerLabel: () => 'Skills',
                type: 'TagList',
                disabled: true,
                props: {
                    options: allEnumValues(RequestSkill),
                    optionToPreviewLabel: (opt) => RequestSkillToLabelMap[opt],
                    multiSelect: true,
                    onTagDeleted: (idx: number, val: any) => {
                        editUserStore().skills.splice(idx, 1)
                    },
                    dark: true
                },
            },
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
            },
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
                type: 'TextArea',
            },
        ]
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