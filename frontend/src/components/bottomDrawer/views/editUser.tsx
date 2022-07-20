import { observer } from "mobx-react";
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { PatchPermissions } from "../../../../../common/models";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../../components/forms/form";
import { resolveErrorMessage } from "../../../errors";
import { navigationRef } from "../../../navigation";
import { editUserStore, userStore, alertStore, bottomDrawerStore, organizationStore } from "../../../stores/interfaces";
import { Colors } from "../../../types";
import { iHaveAllPermissions } from "../../../utils";
import { AttributesListInput } from "../../forms/inputs/defaults/defaultAttributeListInputConfig";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";


@observer
export default class EditUser extends React.Component {
    static submit = {
        isValid: () => {
            return EditUser.onMyProfile()
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

    static onMyProfile = () => {
        return editUserStore().id == userStore().user.id;
    }

    formHomeScreen = observer(({
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {
        const editingMe = EditUser.onMyProfile();

        const headerLabel = editingMe
                ? 'Edit my profile'
                : `Edit ${editUserStore().name}'s profile'`;

        return <>
            <View style={{
                paddingLeft: 20,
                borderStyle: 'solid',
                borderBottomColor: Colors.borders.formFields,
                borderBottomWidth: 1,
                minHeight: 60,
                justifyContent: 'center',
                padding: 20
            }}>
                <Text style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                }}>{headerLabel}</Text>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                { renderInputs(inputs()) }
                { this.canRemoveUser()
                    ? <View style={styles.actionButtonsContainer}>
                        <Button 
                            mode= 'outlined'
                            uppercase={false}
                            style={styles.actionButton}
                            color={styles.actionButton.borderColor}
                            onPress={this.removeUserFromOrg}
                            >
                                {EditUser.onMyProfile() ? 'Leave organization' : 'Remove from organization'}
                        </Button>
                    </View>
                    : null
                }
            </ScrollView>
        </>
    })

    formProps = (): FormProps => {
        const editingMe = EditUser.onMyProfile();

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
            if (EditUser.onMyProfile()) {
                await userStore().removeMyselfFromOrg();
            } else {
                await userStore().removeCurrentUserFromOrg();

                const successMsg = `Successfully removed ${editUserStore().name} from your organization.`
                alertStore().toastSuccess(successMsg);

                navigationRef.current?.goBack();
            }

            bottomDrawerStore().hide();
        } catch (e) {
            alertStore().toastError(resolveErrorMessage(e));
        }
    }

    canRemoveUser = () => EditUser.onMyProfile() || iHaveAllPermissions([PatchPermissions.RemoveFromOrg]);

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
            onSave: (attributes) => editUserStore().attributes = attributes,
            isValid: () => true,
            icon: 'tag-heart',
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
                icon: 'account',
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
                icon: 'clipboard-account',
                required: true
            } as InlineFormInputConfig<'TextInput'>,,
            {
                onChange: (email) => editUserStore().email = email,
                val: () => editUserStore().email,
                isValid: () => editUserStore().emailValid,
                name: 'email',
                placeholderLabel: () => 'Email',
                type: 'TextInput',
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
                onSave: (attributes) => editUserStore().attributes = attributes,
                isValid: () => true,
                icon: 'tag-heart',
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
    actionButtonsContainer: {
        alignContent: 'center',
        marginVertical: 20
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