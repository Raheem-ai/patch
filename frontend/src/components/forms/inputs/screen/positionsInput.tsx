import { observer } from "mobx-react"
import React, { useState } from "react"
import { StyleSheet } from "react-native"
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { AdHocScreenConfig, ScreenFormInputConfig, SectionScreenViewProps } from "../../types"
import { VisualArea } from '../../../helpers/visualArea';
import { unwrap } from "../../../../../../common/utils"
import { iHaveAllPermissions } from "../../../../utils"
import ListInput, { ListInputProps } from "./listInput"
import MangeRolesForm from "../../editRolesForm"
import { PatchPermissions, Position } from "../../../../../../common/models"
import InlineListInput, { InlineListInputProps } from "../inline/inlineListInput"
import { organizationStore } from "../../../../stores/interfaces"
import * as uuid from 'uuid';
import { AttributesListInput } from "../defaults/defaultAttributeListInputConfig"

export type PositionsInputProps = SectionScreenViewProps<'Positions'> 

const PositionsInput = ({ 
    back,
    config,
    paramsFromLabel
}: PositionsInputProps) => {
    const [ position, setPosition ] = useState((paramsFromLabel || {
        role: null,
        attributes: [],
        min: -1,
        max: -1
    }) as Position)

    const inputs = [[
        {
            val: () => [position.role],
            onSave: (val) => { 
                const cpy = Object.assign({}, position, { role: val[0] || null })
                setPosition(cpy) 
            },
            isValid: () => true,
            headerLabel: 'Role',
            placeholderLabel: 'Role',
            previewLabel: () => organizationStore().roles.get(position.role)?.name,
            name: 'role',
            type: 'RoleList'
        },
        AttributesListInput({
            val: () => position.attributes,
            onSave: (val) => { 
                console.log(val.length)
                const cpy = Object.assign({}, position, { attributes: val })
                console.log(cpy)
                setPosition(cpy) 
            },
            isValid: () => true,
            name: 'attributes'
        })
    ]] as [[
        ScreenFormInputConfig<'RoleList'>,
        ScreenFormInputConfig<'CategorizedItemList'>
    ]]

    const homeScreen = observer(({
        onSubmit,
        onContainerPress,
        renderInputs,
        inputs,
        isValid,
        navigateToScreen
    }: CustomFormHomeScreenProps) => {

        const header = () => {
            const headerProps: BackButtonHeaderProps = {
                save: {
                    handler: () => {
                        const updatedPositions: Position[] = JSON.parse(JSON.stringify(config.val()));

                        const idx = updatedPositions.findIndex(pos => pos.id == position.id);

                        console.log('updatedPositions: ', updatedPositions)

                        console.log('position: ', position.attributes)

                        const pos = Object.assign({}, position);

                        if (idx == -1) {
                            pos.id = uuid.v1()

                            updatedPositions.unshift(pos)
                        } else {
                            updatedPositions[idx] = pos
                        }

                        console.log('updatedPositions: ', updatedPositions)

                        config.onSave(updatedPositions);
                        back();
                    },
                    outline: true
                },
                cancel: {
                    handler: () => back()
                },
                label: unwrap(config.headerLabel),
                bottomBorder: true
            }

            return <BackButtonHeader {...headerProps}/>
        }

        return (
            <>
                { header() }
                { renderInputs(inputs()) }
            </>
        )
    })

    return (
        <VisualArea>
            <Form inputs={inputs} homeScreen={homeScreen} />
        </VisualArea>
    )
}

export default PositionsInput;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    }
})