import { observer } from "mobx-react";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { PendingUser, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { resolveErrorMessage } from "../../../errors";
import { alertStore, bottomDrawerStore, newUserStore } from "../../../stores/interfaces";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import STRINGS from "../../../../../common/strings";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { observable, runInAction } from "mobx";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";

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
                        alertStore().toastError({message: resolveErrorMessage(e)});
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    alertStore().toastSuccess({message: STRINGS.ACCOUNT.invitationSuccessful(invitedUser.email, invitedUser.phone)})
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
            <KeyboardAwareArea>
                <BackButtonHeader {...headerConfig} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(inputs()) }
                    </View>
                </ScrollView>
            </KeyboardAwareArea>
        )
    })

    formProps = (): FormProps => {
        return {
            headerLabel: STRINGS.ACCOUNT.inviteTitle, 
            onExpand: () => {
                bottomDrawerStore().hideHeader();
            },
            onBack: () => {
                bottomDrawerStore().showHeader();
            },
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
                    inputType: 'email-address',
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
                    inputType: 'phone-pad',
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
                    // required: true
                }
            ] as [
                InlineFormInputConfig<'TextInput'>, 
                InlineFormInputConfig<'TextInput'>, 
                ScreenFormInputConfig<'TagList'>,
            ]
        }
    }

    render() {
        return <Form ref={this.setRef} {...this.formProps()}/>
    }
                
}


const styles = StyleSheet.create({
    
})