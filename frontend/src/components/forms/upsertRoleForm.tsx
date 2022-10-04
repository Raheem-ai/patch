import { DefaultRoleIds, PatchPermissionGroups, PatchPermissions, PermissionGroupMetadata } from "../../../../common/models"
import { allEnumValues } from "../../../../common/utils"
import { alertStore, upsertRoleStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import { InlineFormInputConfig, ScreenFormInputConfig } from "./types"

import React, { useRef } from "react";
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import { Pressable, ScrollView, View } from "react-native"
import { Button, Text } from "react-native-paper"
import { Colors, ICONS } from "../../types"
import { resolveErrorMessage } from "../../errors"
import { iHaveAllPermissions } from "../../utils"
import KeyboardAwareArea from "../helpers/keyboardAwareArea"
import STRINGS from "../../../../common/strings"
import TestIds from "../../test/ids"

type UpsertRoleFormProps = {
    testID: string,
    cancel: () => void,
    save: () => void, 
    headerLabel: string | (() => string) 
}

const UpsertRoleForm = ({
    testID,
    cancel,
    save,
    headerLabel
}: UpsertRoleFormProps) => {
    const formRef = useRef<Form>();

    const isAnyoneRole = upsertRoleStore().id == DefaultRoleIds.Anyone
    const isAdminRole = upsertRoleStore().id == DefaultRoleIds.Admin
    const isCreating = !upsertRoleStore().id;

    const wrappedTestID = TestIds.upsertRolesForm.wrapper(testID);

    const nameInput = {
        testID: TestIds.upsertRolesForm.inputs.name(wrappedTestID),
        name: 'name',
        required: true,
        type: 'TextInput',
        icon: ICONS.role,
        val: () => upsertRoleStore().name,
        isValid: upsertRoleStore().nameIsValid,
        onChange: (val) => {
            upsertRoleStore().name = val
        },
        placeholderLabel: () => STRINGS.SETTINGS.nameRole
    } as InlineFormInputConfig<'TextInput'>;

    const permissionsInput = {
        onSave: (groups) => upsertRoleStore().permissionGroups = groups,
        val: () => {
            return upsertRoleStore().permissionGroups
        },
        isValid: () => {
            return !!upsertRoleStore().permissionGroups.length
        },
        testID: TestIds.upsertRolesForm.inputs.permissionGroups(wrappedTestID),
        name: 'permissionGroups',
        headerLabel: () => 'Permissions',
        placeholderLabel: () => STRINGS.SETTINGS.setPermissions,
        previewLabel: () => {
            return upsertRoleStore().permissionGroups.map(p => {
                return PermissionGroupMetadata[p].name
            }).join(', ')
        },
        type: 'PermissionGroupList',
        icon: ICONS.permissions,
        required: true,
        disabled: isAdminRole,
        props: {
            options: allEnumValues(PatchPermissionGroups),
            optionToPreviewLabel: (opt: PatchPermissionGroups) => PermissionGroupMetadata[opt].name,
            multiSelect: true,
        }
    } as ScreenFormInputConfig<'PermissionGroupList'>;

    const inputs = []

    if (!isAnyoneRole && !isAdminRole) {
        inputs.push(nameInput)
    }

    inputs.push(permissionsInput);

    const homeScreen = ({
        onContainerPress,
        renderInputs,
        inputs,
        isValid
    }: CustomFormHomeScreenProps) => {
        
        const headerProps: BackButtonHeaderProps = {
            testID: wrappedTestID,
            cancel: {
                handler: cancel
            },
            save: {
                handler: save,
                label: 'Save',
                validator: isAdminRole ? () => false : isValid
            },
            label: headerLabel,
            bottomBorder: true
        }

        const deleteRole = async () => {
            try {
                await upsertRoleStore().delete();
                cancel()
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
            }
        }

        const promptToDeleteRole = () => {
            const roleName = upsertRoleStore().name;
            alertStore().showPrompt({
                title:  STRINGS.SETTINGS.removeRoleDialogTitle(roleName),
                message: STRINGS.SETTINGS.removeRoleDialogText(roleName),
                actions: [
                    {
                        label: STRINGS.SETTINGS.removeRoleDialogOptionNo,
                        onPress: () => {},
                    },
                    {   
                        label: STRINGS.SETTINGS.removeRoleDialogOptionYes,
                        onPress: deleteRole,
                        confirming: true
                    }
                ]
            })
        }

        const iHavePermissionToDelete = iHaveAllPermissions([PatchPermissions.RoleAdmin])

        return (
            <KeyboardAwareArea>
                <Pressable style={{ position: 'relative', flex: 1 }} onPress={onContainerPress}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <BackButtonHeader {...headerProps} />
                        { isAdminRole 
                            ? <View style={{ paddingLeft: 60, padding: 20, borderStyle: 'solid', borderBottomColor: '#ccc', borderBottomWidth: 1 }}>
                                <Text style={{ fontSize: 16 }}>{STRINGS.SETTINGS.cannotDeleteRole('Admin')}</Text>
                            </View>
                            : null
                        }
                        {renderInputs(inputs())}
                        {   !isCreating && !isAnyoneRole && !isAdminRole && iHavePermissionToDelete
                            ? <View style={{ position: 'relative', bottom: 0, padding: 20, width: '100%' }}>
                                <Button
                                    uppercase={false} 
                                    color={Colors.primary.alpha}
                                    mode={'outlined'}
                                    onPress={promptToDeleteRole}    
                                    style={{ borderRadius: 32, borderColor: Colors.primary.alpha, borderWidth: 1, padding: 4 }}>{STRINGS.SETTINGS.deleteRole}</Button>
                            </View>
                            : null
                        }
                    </ScrollView>
                </Pressable>
            </KeyboardAwareArea>
        )
    }

    return <Form testID={wrappedTestID} ref={formRef} inputs={inputs} homeScreen={homeScreen}/>
}

export default UpsertRoleForm;