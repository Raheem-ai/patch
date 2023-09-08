import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { unwrap } from "../../../../../../common/utils"
import Tags from "../../../tags"
import { SectionLabelViewProps } from "../../types"
import SelectableText from "../../../helpers/selectableText"

const TagListLabel = observer(({ config, expand }: SectionLabelViewProps<'TagList' | 'NestedTagList'>) => {

    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    if (!config.val() || !config.val().length) {
        return (
            <Pressable onPress={onPress} style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <SelectableText style={[styles.label, styles.placeholder]}>{unwrap(config.placeholderLabel)}</SelectableText>
            </Pressable>
        )
    }

    return (
        <Pressable onPress={onPress} style={[{ minHeight: 60 }]}>
            <Tags 
                disabled={config.disabled}
                dark={config.props.dark}
                verticalMargin={12} 
                tags={config.val().map(t => config.props.optionToPreviewLabel(t)) || []}
                onTagDeleted={config.disabled ? null : config.props.onTagDeleted}/>
        </Pressable>
    )
})

export default TagListLabel;

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