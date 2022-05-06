import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { PermissionGroupMetadata, resolvePermissionGroups } from "../../../../../../common/models"
import { unwrap } from "../../../../../../common/utils"
import { SectionLabelViewProps } from "../../types"

const DefaultPlaceholder = 'Set permissions'

const PermissionGroupListLabel = observer(({ config, expand }: SectionLabelViewProps<'PermissionGroupList'>) => {

    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand()
    }

    if (!config.val() || !config.val().length) {
        return (
            <Pressable onPress={onPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <Text style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel) || DefaultPlaceholder}</Text>
            </Pressable>
        )
    }

    //implicit padding from line height
    const verticlePadding = 20 - ((styles.label.lineHeight - styles.label.fontSize) / 2) - styles.row.marginVertical
    const resolvedGroups = resolvePermissionGroups(config.val())

    return (
        <Pressable onPress={onPress} style={[{ minHeight: 60, paddingVertical: verticlePadding }]}>
            {
                Array.from(resolvedGroups.values()).map(group => {
                    return (
                        <View style={styles.row}>
                            <Text style={styles.label}>{PermissionGroupMetadata[group].name}</Text>
                        </View>
                    )
                })
            }
        </Pressable>
    )
})

export default PermissionGroupListLabel;

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
        lineHeight: 24,
        fontSize: 16
    }, 
    row: {
        // height: 60,
        marginVertical: 4,
        justifyContent: 'center'
    }

})