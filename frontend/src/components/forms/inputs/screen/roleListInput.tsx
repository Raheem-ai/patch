import { observer } from "mobx-react"
import React, { useState } from "react"
import { StyleSheet } from "react-native"
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { AdHocScreenConfig, SectionScreenViewProps } from "../../types"
import { VisualArea } from '../../../helpers/visualArea';
import { unwrap } from "../../../../../../common/utils"
import { iHaveAllPermissions } from "../../../../utils"
import ListInput, { ListInputProps } from "./listInput"
import MangeRolesForm from "../../editRolesForm"
import { PatchPermissions, DefaultRoleIds } from "../../../../../../common/front"
import InlineListInput, { InlineListInputProps } from "../inline/inlineListInput"
import { organizationStore } from "../../../../stores/interfaces"
import { ICONS } from "../../../../types"
import TestIds from "../../../../test/ids"

export type RoleListInputProps = SectionScreenViewProps<'RoleList'> 

const RoleListInput = ({ 
    back,
    config
}: RoleListInputProps) => {

    const editScreen: AdHocScreenConfig = {
        name: 'edit',
        screen: ({ back: backToSelecting }) => {
            return (
                <MangeRolesForm testID={TestIds.inputs.roleList.edit(config.testID)} back={backToSelecting} />
            )
        }
    } 

    const homeScreen = observer(({
        onSubmit,
        onContainerPress,
        renderInputs,
        inputs,
        isValid,
        navigateToScreen
    }: CustomFormHomeScreenProps) => {

        const [ selectedItems, setSelectedItems ] = useState(config.val())

        const iCanEdit = iHaveAllPermissions([PatchPermissions.RoleAdmin])

        const header = () => {
            const headerProps: BackButtonHeaderProps = {
                testID: config.testID,
                save: {
                    handler: () => {
                        config.onSave(selectedItems);
                        back();
                    },
                    outline: true
                },
                cancel: {
                    handler: () => {
                        config.onCancel?.()
                        back()
                    }
                },
                label: unwrap(config.headerLabel),
                labelDecoration: iCanEdit 
                    ? {
                        name: 'edit',
                        handler: () => {
                            navigateToScreen('edit')
                        }, 
                        icon: ICONS.edit
                    }
                    : null,
                bottomBorder: true
            }

            return <BackButtonHeader {...headerProps}/>
        }

        const roleOptions = Array.from(organizationStore().roles.values()).map(r => {
            return r.id
        }).filter(id => {
            return !config.props?.hideAnyone || id != DefaultRoleIds.Anyone
        })

        const inlineListProps: InlineListInputProps = {
            config: {
                testID: config.testID,
                val: () => selectedItems,
                onChange: (val) => setSelectedItems(val),
                isValid: () => {
                    return !!selectedItems.length
                },
                type: 'InlineList',
                name: 'inlineList',
                props: {
                    onlyAddative: config.props?.onlyAddative,
                    options: roleOptions,
                    optionToPreviewLabel: (roleId: string) => organizationStore().roles.get(roleId).name,
                    optionToListLabel: (roleId: string) => organizationStore().roles.get(roleId).name,
                    multiSelect: config.props?.multiSelect
                }
            }
        }

        return (
            <>
                { header() }
                <InlineListInput {...inlineListProps}/>
            </>
        )
    })

    return (
        // TODO: differentiate when this is actually a noop  for testID on a form
        <Form testID={config.testID} inputs={[]} homeScreen={homeScreen} adHocScreens={[ editScreen ]}/>
    )
}

export default RoleListInput;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    }
})