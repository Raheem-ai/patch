import { observer } from "mobx-react";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { PendingUser, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { resolveErrorMessage } from "../../../errors";
import { alertStore, bottomDrawerStore, newUserStore } from "../../../stores/interfaces";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { observable, runInAction } from "mobx";
import { HeaderHeight, InteractiveHeaderHeight } from "../../../constants";


@observer
export default class AddUser extends React.Component {
    formInstance = observable.box<Form>(null);

    setRef = (formRef: Form) => {
        runInAction(() => {
            this.formInstance.set(formRef)
        })
    }

    formHomeScreen = observer(({
        renderHeader,
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {
        const headerConfig: BackButtonHeaderProps = {
            cancel: {
                handler: async () => {
                    newUserStore().clear();
                },
            },
            save: {
                handler: async () => {
                    let invitedUser: PendingUser;

                    try {
                        bottomDrawerStore().startSubmitting()
                        invitedUser = await newUserStore().inviteNewUser()
                    } catch (e) {
                        alertStore().toastError(resolveErrorMessage(e));
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    alertStore().toastSuccess(`User with email '${invitedUser.email}' and phone '${invitedUser.phone}' successfully invited.`)
                    bottomDrawerStore().hide();
                },
                label: 'Send Invite',
                validator: () => {
                    return this.formInstance.get()?.isValid.get()
                }
            },
            bottomDrawerView: true
        }

        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={InteractiveHeaderHeight}
            >
                <BackButtonHeader {...headerConfig} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(inputs()) }
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        )
    })

    formProps = (): FormProps => {
        return {
            headerLabel: 'Invite a user to join your org by providing their email and phone number!', 
            homeScreen: this.formHomeScreen,
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
            // <KeyboardAvoidingView
            //     behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                // {/* <BottomDrawerViewVisualArea> */}
                    <Form ref={this.setRef} {...this.formProps()}/>
                // {/* </BottomDrawerViewVisualArea> */}
            // </KeyboardAvoidingView>
        )
    }
                
}


const styles = StyleSheet.create({
    
})