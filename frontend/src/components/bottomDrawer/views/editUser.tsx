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
import { editUserStore, userStore, alertStore, bottomDrawerStore, organizationStore } from "../../../stores/interfaces";
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
                label: 'Save',
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
                                mode='outlined'
                                uppercase={false}
                                label={this.onMyProfile ? 'Leave organization' : 'Remove from organization'}
                                onPress={this.removeUserFromOrg} />
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
            headerLabel: editingMe
                ? 'Edit my profile'
                : `Edit ${editUserStore().name}'s profile'`,
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
                headerLabel: 'Roles',
                placeholderLabel: 'Roles',
                previewLabel: () => editUserStore().roles.map(roleId => {
                        return organizationStore().roles.get(roleId)?.name
                    }).join(),
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
            [{
                onChange: (name) => editUserStore().name = name,
                val: () => editUserStore().name,
                isValid: () => editUserStore().nameValid,
                name: 'name',
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                icon: ICONS.responder,
            } as InlineFormInputConfig<'TextInput'>,
            {
                onSave: (bio) => editUserStore().bio = bio,
                val: () => editUserStore().bio,
                isValid: () => editUserStore().bioValid,
                name: 'bio',
                previewLabel: () => editUserStore().bio,
                headerLabel: () => 'Bio',
                placeholderLabel: () => 'Bio',
                type: 'TextArea',
            } as ScreenFormInputConfig<'TextArea'>,
            {
                onChange: (pronouns) => editUserStore().pronouns = pronouns,
                val: () => editUserStore().pronouns,
                isValid: () => editUserStore().pronounsValid,
                name: 'pronouns',
                placeholderLabel: () => 'Pronouns',
                type: 'TextInput',
            } as InlineFormInputConfig<'TextInput'>],
            [{
                onChange: (phone) => editUserStore().phone = phone,
                val: () => editUserStore().phone,
                isValid: () => editUserStore().phoneValid,
                name: 'phone',
                placeholderLabel: () => 'Phone',
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
                name: 'email',
                placeholderLabel: () => 'Email',
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
                    headerLabel: 'Roles',
                    placeholderLabel: 'Roles',
                    previewLabel: () => editUserStore().roles.map(roleId => {
                            return organizationStore().roles.get(roleId)?.name
                        }).join(),
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
                name: 'attributes'
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
        alignContent: 'center',
        margin: 20
    },
    actionButton: {
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 24,
        height: 48,
        justifyContent: 'center',
        marginHorizontal: 38
    },
})