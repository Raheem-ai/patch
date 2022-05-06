import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { IconButton, Text } from "react-native-paper"
import { unwrap } from "../../../../../../common/utils"
import { manageAttributesStore, organizationStore } from "../../../../stores/interfaces"
import { Colors } from "../../../../types"
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
                    const roleName = organizationStore().roles.get(pos.role).name
                    
                    const attrNames = pos.attributes.map(attr => {
                        const category = manageAttributesStore().editStore.categories.get(attr.categoryId);
                        return category.items.find(item => item.id == attr.itemId).name
                    })

                    const min = pos.min;

                    const edit = () => {
                        if (config.disabled) {
                            return
                        }
                        
                        expand?.(pos)
                    }

                    const userIcons = [];
                    
                    for (let i = 0; i < pos.min; i++) {
                        userIcons.push(<UserIcon/>)
                    }

                    return (
                        <Pressable onPress={edit} style={{ flexDirection: 'row', paddingVertical: 20, borderBottomColor: '#E0E0E0', borderBottomWidth: 1 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{roleName}</Text>
                                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                                    { 
                                        attrNames.map(attr => {
                                            return <Text style={{ marginRight: 12, fontSize: 12, color: '#666666' }}>{attr}</Text>
                                        }) 
                                    }
                                </View>
                                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                                    { userIcons }
                                    {
                                        pos.max == -1
                                            ? <IconButton
                                                icon={'plus'} 
                                                color='#999999'
                                                size={20} 
                                                style={{ margin: 0, padding: 0, width: 20 }} />
                                            : null
                                    }
                                </View>
                            </View>
                            <View style={{ alignItems: 'center', marginRight: 20, marginLeft: 20 }}>
                                <IconButton
                                    icon={'pencil'} 
                                    color='#999999'
                                    size={20} 
                                    style={{ margin: 0, padding: 0, width: 20, height: 20 }} />
                            </View>
                        </Pressable>
                    )
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