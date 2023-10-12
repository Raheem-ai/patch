import { observer } from "mobx-react";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { PendingUser, UserRole, UserRoleToInfoLabelMap, UserRoleToLabelMap } from "../../../../../common/front";
import { allEnumValues } from "../../../../../common/utils";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { resolveErrorMessage } from "../../../errors";
import { alertStore, bottomDrawerStore, newUserStore, organizationStore } from "../../../stores/interfaces";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import STRINGS from "../../../../../common/strings";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { observable, runInAction } from "mobx";
import { ICONS } from "../../../types";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";
import TestIds from "../../../test/ids";

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
            testID: TestIds.addUser.form,
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
                        newUserStore().clear()
                    } catch (e) {
                        alertStore().toastError(resolveErrorMessage(e));
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    alertStore().toastSuccess(STRINGS.ACCOUNT.invitationSuccessful(invitedUser.email, invitedUser.phone))
                    bottomDrawerStore().hide();
                },
                label: STRINGS.ACCOUNT.sendInvite,
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
            headerLabel: () => STRINGS.ACCOUNT.inviteTitle, 
            homeScreen: this.formHomeScreen,
            testID: TestIds.addUser.form,
            inputs: [
                {
                    onChange: (email) => newUserStore().email = email,
                    val: () => {
                        return newUserStore().email
                    },
                    isValid: () => {
                        return newUserStore().emailValid
                    },
                    testID: TestIds.addUser.inputs.email,
                    name: 'email',
                    placeholderLabel: () => STRINGS.INTERFACE.email,
                    type: 'TextInput',
                    icon: ICONS.sendEmail,
                    props: {
                        inputType: 'email-address',
                    },
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
                    testID: TestIds.addUser.inputs.phone,
                    name: 'phone',
                    icon: ICONS.callerContactInfo,
                    placeholderLabel: () => STRINGS.INTERFACE.phone,
                    type: 'TextInput',
                    props: {
                        inputType: 'phone-pad',
                    },
                    required: true
                },
                {
                    val: () => newUserStore().roleIds,
                    onSave: (val) => { 
                        newUserStore().roleIds = val
                    },
                    isValid: () => newUserStore().roleIDsValid,
                    headerLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    placeholderLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    previewLabel: () => newUserStore().roleIds.map(roleId => {
                        return organizationStore().roles.get(roleId)?.name
                    }).join(),
                    testID: TestIds.addUser.inputs.role,
                    name: 'role',
                    icon: ICONS.permissions,
                    type: 'RoleList',
                    props: {
                        multiSelect: true,
                        hideAnyone: true
                    }
                }
            ] as [
                InlineFormInputConfig<'TextInput'>, 
                InlineFormInputConfig<'TextInput'>, 
                ScreenFormInputConfig<'RoleList'>,
            ]
        }
    }

    render() {
        return <Form ref={this.setRef} {...this.formProps()}/>
    }
                
}


const styles = StyleSheet.create({
    
})