import { PatchPermissions, PatchPermissionToMetadataMap } from "../../../../common/models"
import { allEnumValues } from "../../../../common/utils"
import { upsertRoleStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import { InlineFormInputConfig, ScreenFormInputConfig } from "./types"

import React, { useRef } from "react";
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import { Pressable } from "react-native"

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

        return (
            <Pressable onPress={onContainerPress}>
                <BackButtonHeader {...headerProps} />
                {renderInputs(inputs)}
            </Pressable>
        )
    }

    return <Form ref={formRef} inputs={inputs} homeScreen={homeScreen}/>
}

export default UpsertRoleForm;