import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { IconButton, Text } from "react-native-paper"
import { ClientSideFormat } from "../../../../../../common/api"
import { PatchPermissions, ProtectedUser } from "../../../../../../common/models"
import { unwrap } from "../../../../../../common/utils"
import { manageAttributesStore, organizationStore, userStore } from "../../../../stores/interfaces"
import { Colors } from "../../../../types"
import PositionCard from "../../../positionCard"
import UserIcon from "../../../userIcon"
import { SectionLabelViewProps } from "../../types"

const PositionsLabel = observer(({ config, expand }: SectionLabelViewProps<'Positions'>) => {

    const onPlaceholderPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    if (!config.val() || !config.val().length) {
        return (
            <Pressable onPress={onPlaceholderPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <Text style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel)}</Text>
            </Pressable>
        )
    }

    return (
        <View style={[{ minHeight: 60 }]}>
            { 
                config.val().map((pos) => {
                    const edit = () => {
                        if (config.disabled) {
                            return
                        }
                        
                        expand?.(pos)
                    }

                    const editConfig = {
                        handler: edit, 
                        permissions: config.props.editPermissions
                    }

                    return <PositionCard pos={pos} edit={editConfig}/>
                })
            }
            <Pressable onPress={onPlaceholderPress} style={{ paddingVertical: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.primary.alpha }}>{'ADD ANOTHER'}</Text>
            </Pressable>
        </View>
    )
})

export default PositionsLabel;

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