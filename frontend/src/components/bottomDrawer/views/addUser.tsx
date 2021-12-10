import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PendingUser, RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigateTo } from "../../../navigation";
import { IAlertStore, IBottomDrawerStore, ILinkingStore, INewUserStore, IUserStore } from "../../../stores/interfaces";
import { getStore } from "../../../stores/meta";
import { routerNames, ScreenProps } from "../../../types";
import { FormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";


@observer
export default class AddUser extends React.Component {
    userStore = getStore<IUserStore>(IUserStore);
    linkingStore = getStore<ILinkingStore>(ILinkingStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    newUserStore = getStore<INewUserStore>(INewUserStore);

    static submit = {
        isValid: () => {
            const newUserStore = getStore<INewUserStore>(INewUserStore);
            return newUserStore.isValid
        },
        action: async () => {
            const newUserStore = getStore<INewUserStore>(INewUserStore);
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const alertStore = getStore<IAlertStore>(IAlertStore);

            let invitedUser: PendingUser;

            try {
                invitedUser = await newUserStore.inviteNewUser()
            } catch (e) {
                alertStore.toastError(resolveErrorMessage(e));
                return
            }

            alertStore.toastSuccess(`User with email '${invitedUser.email}' and phone '${invitedUser.phone}' successfully invited.`)
            bottomDrawerStore.hide();
        },
        label: () => {
            return `Send Invite`
        }
    }

    static onHide = () => {
        const newUserStore = getStore<INewUserStore>(INewUserStore);
        newUserStore.clear();
    }

    formProps = (): FormProps => {
        return {
            headerLabel: 'Invite a user to join your org by providing their email and phone number!', 
            onExpand: () => {
                this.bottomDrawerStore.hideHeader();
            },
            onBack: () => {
                this.bottomDrawerStore.showHeader();
            },
            inputs: [
                {
                    onChange: (email) => this.newUserStore.email = email,
                    val: () => {
                        return this.newUserStore.email
                    },
                    isValid: () => {
                        return this.newUserStore.emailValid
                    },
                    name: 'email',
                    previewLabel: () => this.newUserStore.email,
                    headerLabel: () => 'Email',
                    type: 'TextInput',
                    required: true
                },
                {
                    onChange: (phone) => this.newUserStore.phone = phone,
                    val: () => {
                        return this.newUserStore.phone
                    },
                    isValid: () => {
                        return this.newUserStore.phoneValid
                    },
                    name: 'phone',
                    previewLabel: () => this.newUserStore.phone,
                    headerLabel: () => 'Phone',
                    type: 'TextInput',
                    required: true
                },
                {
                    onSave: (roles) => this.newUserStore.roles = roles,
                    val: () => {
                        return this.newUserStore.roles
                    },
                    isValid: () => {
                        return !!this.newUserStore.rolesValid
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
                            this.newUserStore.roles.splice(idx, 1)
                        },
                    },
                    required: true
                },
                {
                    onSave: (skills) => this.newUserStore.skills = skills,
                    val: () => {
                        return this.newUserStore.skills
                    },
                    isValid: () => {
                        return this.newUserStore.skillsValid
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
                            this.newUserStore.skills.splice(idx, 1)
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
            <BottomDrawerViewVisualArea>
                <Form {...this.formProps()}/>
            </BottomDrawerViewVisualArea>
        )
    }
                
}


const styles = StyleSheet.create({
    
})