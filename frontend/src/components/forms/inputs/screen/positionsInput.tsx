import { observer } from "mobx-react"
import React, { useState } from "react"
import { StyleSheet } from "react-native"
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { InlineFormInputConfig, ScreenFormInputConfig, SectionScreenViewProps } from "../../types"
import { VisualArea } from '../../../helpers/visualArea';
import { unwrap } from "../../../../../../common/utils"
import { Position } from "../../../../../../common/models"
import { organizationStore } from "../../../../stores/interfaces"
import * as uuid from 'uuid';
import { AttributesListInput } from "../defaults/defaultAttributeListInputConfig"
import { observable } from "mobx"

export type PositionsInputProps = SectionScreenViewProps<'Positions'> 

const PositionsInput = observer(({ 
    back,
    config,
    paramsFromLabel
}: PositionsInputProps) => {
    const [ position ] = useState(observable.box((paramsFromLabel || {
        role: null,
        attributes: [],
        min: 0,
        max: -1
    }) as Position))
    
    const inputs = [[
        {
            val: () => {
                return { 
                    min: position.get().min, 
                    max: position.get().max
                }
            },
            onChange: (val) => { 
                const cpy = Object.assign({}, position.get(), { min: val.min, max: val.max }) as Position
                position.set(cpy) 
                console.log(cpy)
            },
            isValid: () => true,
            name: 'minmax',
            type: 'Slider',
            icon: 'clipboard-account',
            props: {
                maxBeforeOrMore: 10
            }
        },
        {
            val: () => [position.get().role],
            onSave: (val) => { 
                const cpy = Object.assign({}, position.get(), { role: val[0] || null }) as Position
                position.set(cpy) 
            },
            isValid: () => true,
            headerLabel: 'Role',
            placeholderLabel: 'Role',
            previewLabel: () => organizationStore().roles.get(position.get().role)?.name,
            name: 'role',
            type: 'RoleList'
        },
        AttributesListInput({
            val: () => position.get().attributes,
            onSave: (val) => { 
                const cpy = Object.assign({}, position.get(), { attributes: val }) as Position
                position.set(cpy) 
            },
            isValid: () => true,
            name: 'attributes'
        })
    ]] as [[
        InlineFormInputConfig<'Slider'>,
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

                        const idx = updatedPositions.findIndex(pos => pos.id == position.get().id);

                        const pos = Object.assign({}, position.get()) as Position;

                        if (idx == -1) {
                            pos.id = uuid.v1()

                            updatedPositions.unshift(pos)
                        } else {
                            updatedPositions[idx] = pos
                        }

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
})

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