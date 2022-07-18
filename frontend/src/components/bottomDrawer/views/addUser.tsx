import { observer } from "mobx-react";
import React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { PendingUser, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../forms/form";
import { resolveErrorMessage } from "../../../errors";
import { alertStore, bottomDrawerStore, newUserStore } from "../../../stores/interfaces";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
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
                    placeholderLabel: () => 'Email',
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
                    placeholderLabel: () => 'Phone',
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
                    placeholderLabel: () => 'Roles',
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
                }
            ] as [
                InlineFormInputConfig<'TextInput'>, 
                InlineFormInputConfig<'TextInput'>, 
                ScreenFormInputConfig<'TagList'>,
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