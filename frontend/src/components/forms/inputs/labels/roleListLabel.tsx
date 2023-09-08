import { runInAction } from "mobx"
import { observer } from "mobx-react"
import React, { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { unwrap } from "../../../../../../common/utils"
import { organizationStore } from "../../../../stores/interfaces"
import TestIds from "../../../../test/ids"
import Tags from "../../../tags"
import { SectionLabelViewProps } from "../../types"
import SelectableText from "../../../helpers/selectableText"

const RoleListLabel = observer(({ config, expand }: SectionLabelViewProps<'RoleList'>) => {
    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    const wrappedTestID = TestIds.inputs.roleList.labelWrapper(config.testID);

    if (!config.val() || !config.val().length) {
        return (
            <Pressable testID={wrappedTestID} onPress={onPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <SelectableText style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel)}</SelectableText>
            </Pressable>
        )
    }

    const selectedRoles = config.val().map(roleId => organizationStore().roles.get(roleId)?.name).filter(name => !!name);

    const onRoleRemoved = (idx: number, tag: string) => {
        const lastAndNecessary = (config.props.onlyAddative && (config.val().length == 1))
            
        if (!lastAndNecessary) {
            config.props?.onItemDeleted(idx, tag);
        }
    }

    return (
        <Pressable testID={wrappedTestID} onPress={onPress} style={[{ minHeight: 60 }]}>
            {
                <View style={{ paddingVertical: 6 }}>
                    <Tags 
                        disabled={config.disabled}
                        verticalMargin={6} 
                        horizontalTagMargin={6}
                        tags={selectedRoles}
                        dark={true}
                        testID={wrappedTestID}
                        // only pass callback if we got one so the "x" isn't shown if you can't delete
                        onTagDeleted={config.props?.onItemDeleted ? onRoleRemoved : null}/>
                </View>
            }
        </Pressable>
    )
})

export default RoleListLabel;

const styles = StyleSheet.create({
    section: {
      minHeight: 60,
      justifyContent: 'center'
    }, 
    disabledSection: {
        backgroundColor: '#E0DEE0'
    },
    placeholder: {
        color: '#aaa'
    },
    label: {
        color: '#000',
        maxHeight: 120,
        paddingVertical: 12,
        lineHeight: 24,
        fontSize: 16
    }
})