
// TODO: update to use permission groups
import { DefaultRoleIds, PatchPermissions, PatchPermissionToMetadataMap } from "../../../../common/models"
import { allEnumValues } from "../../../../common/utils"
import { alertStore, upsertRoleStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import { InlineFormInputConfig, ScreenFormInputConfig } from "./types"

import React, { useRef } from "react";
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import { Pressable, View } from "react-native"
import { Button } from "react-native-paper"
import { Colors } from "../../types"
import { resolveErrorMessage } from "../../errors"

type UpsertRoleFormProps = {
    cancel: () => void,
    save: () => void, 
    headerLabel: string | (() => string) 
}

const UpsertRoleForm = ({
    cancel,
    save,
    headerLabel
}: UpsertRoleFormProps) => {
    const formRef = useRef<Form>();

    const inputs = [
        {
            name: 'name',
            required: true,
            type: 'TextInput',
            icon: 'clipboard-account',
            val: () => upsertRoleStore().name,
            isValid: upsertRoleStore().nameIsValid,
            onChange: (val) => {
                upsertRoleStore().name = val
            },
            placeholderLabel: () => 'Name this role'
        },
        {
            onSave: (permissions) => upsertRoleStore().permissions = permissions,
            val: () => {
                return upsertRoleStore().permissions
            },
            isValid: () => {
                return !!upsertRoleStore().permissions.length
            },
            name: 'permissions',
            headerLabel: () => 'Permissions',
            placeholderLabel: () => 'Set permissions',
            previewLabel: () => {
                return upsertRoleStore().permissions.map(p => {
                    return PatchPermissionToMetadataMap[p].name
                }).join(', ')
            },
            type: 'List',
            icon: 'key',
            required: true,
            props: {
                options: allEnumValues(PatchPermissions),
                optionToPreviewLabel: (opt: PatchPermissions) => PatchPermissionToMetadataMap[opt].name,
                multiSelect: true,
            }
        }
    ] as [
        InlineFormInputConfig<'TextInput'>,
        ScreenFormInputConfig<'List'>
    ]

    const homeScreen = ({
        onContainerPress,
        renderInputs,
        inputs,
        isValid
    }: CustomFormHomeScreenProps) => {
        
        const headerProps: BackButtonHeaderProps = {
            cancel: {
                handler: cancel
            },
            save: {
                handler: save,
                label: 'Save',
                validator: isValid
            },
            label: headerLabel,
            bottomBorder: true
        }

        const deleteRole = async () => {
            try {
                await upsertRoleStore().delete();
                cancel()
            } catch (e) {
                const errMessage = resolveErrorMessage(e)
                alertStore().toastError(errMessage, true)
            }
        }

        return (
            <Pressable style={{ position: 'relative', flex: 1 }} onPress={onContainerPress}>
                <BackButtonHeader {...headerProps} />
                {renderInputs(inputs())}
                {   upsertRoleStore().id != DefaultRoleIds.Anyone
                    ? <View style={{ position: 'absolute', bottom: 0, padding: 20, width: '100%' }}>
                        <Button
                            uppercase={false} 
                            color={Colors.primary.alpha}
                            mode={'outlined'}
                            onPress={deleteRole}    
                            style={{ borderRadius: 32, borderColor: Colors.primary.alpha, borderWidth: 1, padding: 4 }}>{'Delete this role'}</Button>
                    </View>
                    : null
                }
            </Pressable>
        )
    }

    return <Form ref={formRef} inputs={inputs} homeScreen={homeScreen}/>
}

export default UpsertRoleForm;