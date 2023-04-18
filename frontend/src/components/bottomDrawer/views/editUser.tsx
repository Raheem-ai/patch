import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { PatchPermissions } from "../../../../../common/models";
import STRINGS from "../../../../../common/strings";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigationRef } from "../../../navigation";
import { editUserStore, userStore, alertStore, bottomDrawerStore, BottomDrawerView, organizationStore } from "../../../stores/interfaces";
import TestIds from "../../../test/ids";
import { Colors, ICONS } from "../../../types";
import { iHaveAllPermissions } from "../../../utils";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { AttributesListInput } from "../../forms/inputs/defaults/defaultAttributeListInputConfig";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";
import PatchButton from "../../patchButton";

@observer
export default class EditUser extends React.Component {
    formInstance = observable.box<Form>(null);

    get onMyProfile() {
        return editUserStore().id == userStore().user.id;
    }

    get formIds() {
        return this.onMyProfile
            ? TestIds.editMe
            : TestIds.editUser
    }

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
            testID: this.formIds.form,
            cancel: {
                handler: async () => {
                    editUserStore().clear();
                },
            },
            save: {
                handler: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()

                        await (this.onMyProfile
                            ? editUserStore().editMe()
                            : editUserStore().editUser());
                    } catch (e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return   
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const successMsg = this.onMyProfile
                        ? STRINGS.ACCOUNT.updatedProfileSuccess()
                        : STRINGS.ACCOUNT.updatedProfileSuccess(editUserStore().name)

                    alertStore().toastSuccess(successMsg)

                    bottomDrawerStore().hide();
                },
                label: STRINGS.INTERFACE.save,
                validator: () => {
                    return this.formInstance.get()?.isValid.get()
                }
            },
            bottomDrawerView: true
        }

        return (
            <KeyboardAwareArea>
                <BackButtonHeader {...headerConfig} />
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    { renderHeader() }
                    { renderInputs(inputs()) }
                    { this.canRemoveUser()
                        ? <View style={styles.actionButtonsContainer}>
                            <PatchButton 
                                testID={this.formIds.removeUser}
                                mode='text'
                                style={ styles.actionButton }
                                label={ STRINGS.ACCOUNT.removeUser(this.onMyProfile, organizationStore().metadata.name) }
                                onPress={this.promptToRemoveUser} />
                                { this.onMyProfile 
                            ? <PatchButton 
                                testID={this.formIds.deleteAccount}
                                mode='text'
                                label={ STRINGS.ACCOUNT.deletePatchAccount }
                                onPress={this.promptToDeleteAccount} />
                            : null }
                        </View>
                        : null
                    }
                </ScrollView>
            </KeyboardAwareArea>
        )
    })

    formProps = (): FormProps => {
        const editingMe = this.onMyProfile;

        return {
            testID: this.formIds.form,
            headerLabel: () => {
                return editingMe
                    ? STRINGS.ACCOUNT.editMyProfile
                    : STRINGS.ACCOUNT.editUserProfile(editUserStore().name)
            },
            inputs: editingMe
                ? this.editMeInputs()
                : this.editUserInputs(),
            homeScreen: this.formHomeScreen
        }
    }

    onItemDeleted = (index: number) => {
        if (index != -1) {
            const updatedSelection = editUserStore().roles.slice()
            updatedSelection.splice(index, 1);
            editUserStore().roles = updatedSelection;
        }
    }

    removeUserFromOrg = async () => {
        try {

            bottomDrawerStore().startSubmitting()

            if (this.onMyProfile) {
                await userStore().removeMyselfFromOrg();
            } else {
                await userStore().removeCurrentUserFromOrg();

                alertStore().toastSuccess(STRINGS.ACCOUNT.removedUserSuccess(editUserStore().name));

                navigationRef.current?.goBack();
            }

            bottomDrawerStore().hide();
        } catch (e) {
            alertStore().toastError(resolveErrorMessage(e));
        } finally {
            bottomDrawerStore().endSubmitting()
        }
    }

    canRemoveUser = () => this.onMyProfile || iHaveAllPermissions([PatchPermissions.RemoveFromOrg]);

    promptToRemoveUser = () => {
        alertStore().showPrompt({
            title:  STRINGS.ACCOUNT.removeDialogTitle(this.onMyProfile, organizationStore().metadata.name),
            message: STRINGS.ACCOUNT.removeDialogText(this.onMyProfile, editUserStore().name),
            actions: [
                {
                    label: STRINGS.ACCOUNT.removeDialogOptionNo(),
                    onPress: () => {}
                },
                {   
                    label: STRINGS.ACCOUNT.removeDialogOptionYes(this.onMyProfile, editUserStore().name),
                    onPress: this.removeUserFromOrg,
                    confirming: true
                }
            ]
        })
    }

    promptToDeleteAccount = () => {
        alertStore().showPrompt({
            title:  STRINGS.ACCOUNT.deleteDialogTitle,
            message: STRINGS.ACCOUNT.deleteDialogText,
            actions: [
                {
                    label: STRINGS.ACCOUNT.deleteDialogOptionNo(),
                    onPress: () => {}
                },
                {   
                    label: STRINGS.ACCOUNT.deleteDialogOptionYes(),
                    onPress: async () => {
                        try {
                            await userStore().deleteMyAccount()
                        } catch (e) {
                            alertStore().toastError(resolveErrorMessage(e));
                        }
                    },
                    confirming: true
                }
            ]
        })
    }

    editUserInputs = () => {
        const canEditAttributes = iHaveAllPermissions([PatchPermissions.AssignAttributes]);
        const canEditRoles = iHaveAllPermissions([PatchPermissions.AssignRoles]);
        
        const inputs = [
            canEditRoles
                ? {
                    val: () => editUserStore().roles,
                    onSave: (roles) => editUserStore().roles = roles,
                    isValid: () => {
                        return editUserStore().rolesValid
                    },
                    headerLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    placeholderLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    previewLabel: () => editUserStore().roles.map(roleId => {
                            return organizationStore().roles.get(roleId)?.name
                        }).join(),
                    testID: this.formIds.inputs.roles,
                    name: 'roles',
                    type: 'RoleList',
                    icon: ICONS.permissions,
                    disabled: false,
                    props: {
                        multiSelect: true,
                        hideAnyone: true,
                    },
                } as ScreenFormInputConfig<'RoleList'>
                : null,
            canEditAttributes
                ? AttributesListInput({
                    val: () => editUserStore().attributes,
                    onSave: (attributes) => editUserStore().attributes = attributes,
                    isValid: () => true,
                    icon: ICONS.tag,
                    name: 'attributes',
                    testID: this.formIds.inputs.attributes
                }) as ScreenFormInputConfig<'CategorizedItemList'>
                : null
        ].filter(v => !!v);

        return inputs;
    }

    editMeInputs = () => {
        const canEditAttributes = iHaveAllPermissions([PatchPermissions.AssignAttributes]);
        const canEditRoles = iHaveAllPermissions([PatchPermissions.AssignRoles]);

        const inputs = [
            [{
                onChange: (name) => editUserStore().name = name,
                val: () => editUserStore().name,
                isValid: () => editUserStore().nameValid,
                testID: this.formIds.inputs.name,
                name: 'name',
                placeholderLabel: () => STRINGS.INTERFACE.name,
                type: 'TextInput',
                icon: ICONS.responder,
                required: true
            } as InlineFormInputConfig<'TextInput'>,
            {
                onSave: (bio) => editUserStore().bio = bio,
                val: () => editUserStore().bio,
                isValid: () => editUserStore().bioValid,
                testID: this.formIds.inputs.bio,
                name: 'bio',
                previewLabel: () => editUserStore().bio,
                headerLabel: () => STRINGS.INTERFACE.bio,
                placeholderLabel: () => STRINGS.INTERFACE.bio,
                type: 'TextArea',
            } as ScreenFormInputConfig<'TextArea'>,
            {
                onChange: (pronouns) => editUserStore().pronouns = pronouns,
                val: () => editUserStore().pronouns,
                isValid: () => editUserStore().pronounsValid,
                testID: this.formIds.inputs.pronouns,
                name: 'pronouns',
                placeholderLabel: () => STRINGS.INTERFACE.pronouns,
                type: 'TextInput',
            } as InlineFormInputConfig<'TextInput'>],
            [{
                onChange: (phone) => editUserStore().phone = phone,
                val: () => editUserStore().phone,
                isValid: () => editUserStore().phoneValid,
                testID: this.formIds.inputs.phone,
                name: 'phone',
                placeholderLabel: () => STRINGS.INTERFACE.phone,
                type: 'TextInput',
                props: {
                    inputType: 'phone-pad',
                },
                icon: ICONS.callerContactInfo,
                required: true
            } as InlineFormInputConfig<'TextInput'>,
            {
                onChange: (email) => editUserStore().email = email,
                val: () => editUserStore().email,
                isValid: () => editUserStore().emailValid,
                testID: this.formIds.inputs.email,
                name: 'email',
                placeholderLabel: () => STRINGS.INTERFACE.email,
                type: 'TextInput',
                props: {
                    inputType: 'email-address',
                },
                // TODO: remove when we have logic for changing email
                disabled: true
            } as InlineFormInputConfig<'TextInput'>],
            canEditRoles
                ? {
                    val: () => editUserStore().roles,
                    onSave: (roles) => editUserStore().roles = roles,
                    isValid: () => editUserStore().rolesValid,
                    headerLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    placeholderLabel: STRINGS.cap(STRINGS.ELEMENTS.role(true)),
                    previewLabel: () => editUserStore().roles.map(roleId => {
                            return organizationStore().roles.get(roleId)?.name
                        }).join(),
                    testID: this.formIds.inputs.roles,
                    name: 'roles',
                    type: 'RoleList',
                    icon: ICONS.permissions,
                    disabled: false,
                    props: {
                        multiSelect: true,
                        hideAnyone: true
                    },
                } as ScreenFormInputConfig<'RoleList'>
                : null,
            canEditAttributes
            ? AttributesListInput({
                val: () => editUserStore().attributes,
                onSave: (attributes) => editUserStore().attributes = attributes,
                isValid: () => true,
                icon: ICONS.tag,
                name: 'attributes',
                testID: this.formIds.inputs.attributes
            }) as ScreenFormInputConfig<'CategorizedItemList'>
            : null
        ].filter(v => !!v);

        return inputs;
    }

    render() {
        return <Form ref={this.setRef} {...this.formProps()}/>
    }
}

const styles = StyleSheet.create({
    actionButtonsContainer: {
        display: "flex",
        flexDirection: "column",
        alignContent: 'flex-start',
        margin: 20,
        marginTop: 8,
        marginBottom: 36,
    },
    actionButton: {
        paddingVertical: 16,
    }
})