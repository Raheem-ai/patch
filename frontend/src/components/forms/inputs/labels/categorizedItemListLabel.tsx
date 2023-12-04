import { runInAction } from "mobx"
import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { unwrap } from "../../../../../../common/utils"
import TestIds from "../../../../test/ids"
import Tags from "../../../tags"
import { SectionLabelViewProps } from "../../types"
import SelectableText from "../../../helpers/selectableText"

const CategorizedItemListLabel = observer(({ config, expand }: SectionLabelViewProps<'CategorizedItemList'>) => {

    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    const wrappedTestID = TestIds.inputs.categorizedItemList.labelWrapper(config.testID);

    if (!config.val() || !config.val().length) {
        return (
            <Pressable testID={wrappedTestID} onPress={onPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <SelectableText style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel)}</SelectableText>
            </Pressable>
        )
    }

    const tagMap: Map<string, string[]> = new Map();

    config.val().forEach(selected => {
        if (tagMap.has(selected.categoryId)) {
            tagMap.get(selected.categoryId).push(selected.itemId)
        } else {
            tagMap.set(selected.categoryId, [selected.itemId])
        }
    })

    return (
        <Pressable testID={wrappedTestID} onPress={onPress} style={[{ minHeight: 60 }]}>
            {
                Array.from(tagMap.entries()).map(([categoryId, itemIds], idx, arr) => {
                    const category = config.props.definedCategories().get(categoryId)

                    if (!category) {
                        return null;
                    }

                    const categoryName = category.name.toUpperCase();
                    const isLast = (idx == arr.length - 1);

                    const itemNames = itemIds.map(selectedItemId => {
                        return category.items.find(item => item.id == selectedItemId)?.name || null
                    }).filter(x => !!x)

                    if (!itemNames.length) {
                        return null
                    }

                    const tagTestID = TestIds.inputs.categorizedItemList.tagWrapper(config.testID, categoryId);

                    return (
                        <View style={{ paddingTop: 20, paddingBottom: isLast ? (20 - 6) : 0 }}>
                            <SelectableText style={{ color: '#999' }}>{categoryName}</SelectableText>
                            <Tags 
                                testID={tagTestID}
                                disabled={config.disabled}
                                dark={config.props.dark}
                                verticalMargin={6} 
                                horizontalTagMargin={6}
                                tags={itemNames}
                                onTagDeleted={config.disabled ? null : config.props.onItemDeleted}/>
                        </View>
                    )
                })
            }
            
        </Pressable>
    )
})

export default CategorizedItemListLabel;

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