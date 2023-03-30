import { observer } from "mobx-react"
import React, { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { InlineFormInputConfig, ScreenFormInputConfig, SectionScreenViewProps } from "../../types"
import { VisualArea } from '../../../helpers/visualArea';
import { mergeArrayCollectionUpdates, unwrap } from "../../../../../../common/utils"
import { DefaultRoleIds, Position, PositionSetUpdate, PositionUpdate } from "../../../../../../common/models"
import { manageAttributesStore, organizationStore } from "../../../../stores/interfaces"
import * as uuid from 'uuid';
import { AttributesListInput } from "../defaults/defaultAttributeListInputConfig"
import { observable } from "mobx"
import { Colors, ICONS } from "../../../../types";
import PatchButton from "../../../patchButton";
import TestIds from "../../../../test/ids";

export type PositionsInputProps = SectionScreenViewProps<'Positions'> 

const PositionsInput = observer(({ 
    back,
    config,
    paramsFromLabel
}: PositionsInputProps) => {
    const [ position ] = useState(observable.box((paramsFromLabel || {
        role: DefaultRoleIds.Anyone,
        attributes: [],
        joinedUsers: [],
        min: 2,
        max: -1
    }) as Position))

    // if we're in create mode, don't need to track updates
    const [ updates ] = useState(observable.box(
        !!paramsFromLabel 
            ? { 
                id: (paramsFromLabel as Position).id,
                replacedProperties: {},
                attributeUpdates: {
                    addedItems: [],
                    removedItems: []
                }
            } as PositionUpdate
            : null
    ))
    
    const wrappedTestID = TestIds.inputs.positions.wrapper(config.testID);

    const inputs = [[
        {
            val: () => {
                return { 
                    min: position.get().min, 
                    max: position.get().max
                }
            },
            onChange: (val) => { 
                const curr = position.get();
                const currUpdate = updates.get()

                // if in edit mode, update the diff for min/max if either changed
                if (currUpdate) {
                    const currDiff = Object.assign({}, currUpdate)
                    let changed = false

                    if (val.max != curr.max) {
                        currDiff.replacedProperties.max = val.max
                        changed = true
                    }

                    if (val.min != curr.min) {
                        currDiff.replacedProperties.min = val.min
                        changed = true
                    }

                    if (changed) {
                        updates.set(currDiff)
                    }
                }

                const cpy = Object.assign({}, curr, { min: val.min, max: val.max }) as Position
                position.set(cpy) 
            },
            isValid: () => true,
            name: 'minmax',
            testID: TestIds.inputs.positions.inputs.minMax(wrappedTestID),
            type: 'Slider',
            icon: ICONS.accountMultiple,
            props: {
                maxBeforeOrMore: 10
            }
        },
        {
            val: () => {
                const roleId = position.get().role
                
                // default to any if role has been deleted (locally or remotely)
                return [
                    organizationStore().roles.get(roleId)
                        ? roleId
                        : DefaultRoleIds.Anyone
                ]
            },
            onSave: (val) => { 
                const curr = position.get();
                const currUpdate = updates.get()

                // if in edit mode, update diff with role change
                if (currUpdate) {
                    if (val[0] != curr.role) {
                        const currDiff = Object.assign({}, currUpdate)

                        currDiff.replacedProperties.role = val[0]
                        updates.set(currDiff)
                    }
                }

                const cpy = Object.assign({}, curr, { role: val[0] || null }) as Position
                position.set(cpy) 
            },
            isValid: () => true,
            headerLabel: 'Role',
            placeholderLabel: 'Role',
            previewLabel: () => organizationStore().roles.get(position.get().role)?.name,
            name: 'role',
            testID: TestIds.inputs.positions.inputs.roles(wrappedTestID),
            type: 'RoleList',
            icon: ICONS.role,
            props: {
                onlyAddative: true
            }
        },
        AttributesListInput({
            testID: TestIds.inputs.positions.inputs.attributes(wrappedTestID),
            val: () => (position.get().attributes || []).filter(attr => !!manageAttributesStore().getAttribute(attr.categoryId, attr.itemId)),
            onSave: (val, diff) => {
                const curr = position.get();
                const currUpdate = updates.get()

                // if in edit morde, update diff with changes to attribute selection
                if (currUpdate) {
                    const currDiff = Object.assign({}, currUpdate)
                    mergeArrayCollectionUpdates(currDiff.attributeUpdates, diff, (a, b) => a.categoryId == b.categoryId && a.itemId == b.itemId)
                    updates.set(currDiff)
                }

                const cpy = Object.assign({}, curr, { attributes: val }) as Position
                position.set(cpy) 
            },
            isValid: () => true,
            name: 'attributes',
            icon: ICONS.tag
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
                testID: wrappedTestID,
                save: {
                    handler: () => {
                        const updatedPositions: Position[] = JSON.parse(JSON.stringify(config.val()));

                        const idx = updatedPositions.findIndex(pos => pos.id == position.get().id);

                        const pos = Object.assign({}, position.get()) as Position;

                        const diff: PositionSetUpdate = {
                            addedItems: [],
                            itemUpdates: [],
                            removedItems: []
                        }

                        // one we're saving is new 
                        if (idx == -1) {
                            pos.id = uuid.v1()

                            updatedPositions.unshift(pos)
                            diff.addedItems.push(pos)
                        } else {
                            updatedPositions[idx] = pos
                            diff.itemUpdates.push(Object.assign({}, updates.get()))
                        }

                        config.onSave(updatedPositions, diff);
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
                bottomBorder: true
            }

            return <BackButtonHeader {...headerProps}/>
        }

        const renderDeleteButton = () => {
            const deletePosition = () => {
                const updatedPositions: Position[] = JSON.parse(JSON.stringify(config.val()));

                const idx = updatedPositions.findIndex(pos => pos.id == position.get().id);

                const removed = updatedPositions[idx];
                
                updatedPositions.splice(idx, 1)

                const diff: PositionSetUpdate = {
                    addedItems: [],
                    itemUpdates: [],
                    removedItems: [removed]
                }

                config.onSave(updatedPositions, diff);
                
                back();
            }

            return position.get().id
                ? <View style={{ marginVertical: 32, paddingHorizontal: 16 }}>
                    <PatchButton 
                        testID={TestIds.inputs.positions.delete(wrappedTestID)}
                        mode='outlined'
                        uppercase={false}
                        label='Delete this position'
                        onPress={deletePosition}/>
                </View>
                : null
        }

        return (
            <>
                { header() }
                { renderInputs(inputs()) }
                { renderDeleteButton() }
            </>
        )
    })

    return <Form testID={wrappedTestID} inputs={inputs} homeScreen={homeScreen} />
})

export default PositionsInput;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    },
    button: {
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.primary.alpha,
        fontWeight: '900',
        justifyContent: 'center',
        marginTop: 24,
        paddingHorizontal: 8,
        
    },
    buttonLabel: {
        fontWeight: '700',
        letterSpacing: 0.8
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
        backgroundColor: Colors.nocolor,
        color: Colors.primary.alpha
    }
})