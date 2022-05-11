import { runInAction } from "mobx"
import { observer } from "mobx-react"
import React, { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { unwrap } from "../../../../../../common/utils"
import { organizationStore } from "../../../../stores/interfaces"
import Tags from "../../../tags"
import { SectionLabelViewProps } from "../../types"

const RoleListLabel = observer(({ config, expand }: SectionLabelViewProps<'RoleList'>) => {
    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    if (!config.val() || !config.val().length) {
        return (
            <Pressable onPress={onPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <Text style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel)}</Text>
            </Pressable>
        )
    }

    const selectedRoles = config.val().map(roleId => organizationStore().roles.get(roleId)?.name).filter(name => !!name);

    return (
        <Pressable onPress={onPress} style={[{ minHeight: 60 }]}>
            {
                <View style={{ paddingVertical: 20 - 6}}>
                    <Tags 
                        disabled={config.disabled}
                        verticalMargin={6} 
                        horizontalTagMargin={6}
                        tags={selectedRoles}
                        onTagDeleted={config.props?.onItemDeleted ? config.props.onItemDeleted : null}/>
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