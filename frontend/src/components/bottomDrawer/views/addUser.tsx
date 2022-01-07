import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PendingUser, RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigateTo } from "../../../navigation";
import { alertStore, bottomDrawerStore, IAlertStore, IBottomDrawerStore, ILinkingStore, INewUserStore, IUserStore, newUserStore } from "../../../stores/interfaces";
import { routerNames, ScreenProps } from "../../../types";
import { FormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";


@observer
export default class AddUser extends React.Component {
    static submit = {
        isValid: () => {
            return newUserStore().isValid
        },
        action: async () => {

            let invitedUser: PendingUser;

            try {
                invitedUser = await newUserStore().inviteNewUser()
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e));
                return
            }

            alertStore().toastSuccess(`User with email '${invitedUser.email}' and phone '${invitedUser.phone}' successfully invited.`)
            bottomDrawerStore().hide();
        },
        label: () => {
            return `Send Invite`
        }
    }

    static onHide = () => {
        newUserStore().clear();
    }

    formProps = (): FormProps => {
        return {
            headerLabel: 'Invite a user to join your org by providing their email and phone number!', 
            onExpand: () => {
                bottomDrawerStore().hideHeader();
            },
            onBack: () => {
                bottomDrawerStore().showHeader();
            },
            inputs: [
                {
                    onChange: (email) => newUserStore().email = email,
                    val: () => {
                        return newUserStore().email
                    },
                    isValid: () => {
                        return newUserStore().emailValid
                    },
                    name: 'email',
                    previewLabel: () => newUserStore().email,
                    headerLabel: () => 'Email',
                    type: 'TextInput',
                    required: true
                },
                {
                    onChange: (phone) => newUserStore().phone = phone,
                    val: () => {
                        return newUserStore().phone
                    },
                    isValid: () => {
                        return newUserStore().phoneValid
                    },
                    name: 'phone',
                    previewLabel: () => newUserStore().phone,
                    headerLabel: () => 'Phone',
                    type: 'TextInput',
                    required: true
                },
                {
                    onSave: (roles) => newUserStore().roles = roles,
                    val: () => {
                        return newUserStore().roles
                    },
                    isValid: () => {
                        return !!newUserStore().rolesValid
                    },
                    name: 'roles',
                    previewLabel: () => null,
                    headerLabel: () => 'Roles',
                    type: 'TagList',
                    props: {
                        options: allEnumValues(UserRole),
                        optionToPreviewLabel: (opt) => UserRoleToLabelMap[opt],
                        optionToListLabel: (opt) => UserRoleToInfoLabelMap[opt],
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            newUserStore().roles.splice(idx, 1)
                        },
                    },
                    required: true
                },
                {
                    onSave: (skills) => newUserStore().skills = skills,
                    val: () => {
                        return newUserStore().skills
                    },
                    isValid: () => {
                        return newUserStore().skillsValid
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
                            newUserStore().skills.splice(idx, 1)
                        },
                        dark: true
                    },
                }
                
            ] as [
                FormInputConfig<'TextInput'>, 
                FormInputConfig<'TextInput'>, 
                FormInputConfig<'TagList'>,
                FormInputConfig<'TagList'>,
            ]
        }
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