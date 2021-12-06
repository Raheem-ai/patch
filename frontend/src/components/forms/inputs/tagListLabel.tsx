import { runInAction } from "mobx"
import { observer } from "mobx-react"
import React from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "react-native-paper"
import { unwrap } from "../../../../../common/utils"
import Tags from "../../tags"
import { SectionScreenProps } from "../types"

const TagListLabel = observer(({ config }: SectionScreenProps<'TagList' | 'NestedTagList'>) => {

    if (!config.val() || !config.val().length) {
        return (
            <View style={[styles.section, config.disabled ? styles.disabledSection : null]}>
                <Text style={[styles.label, styles.placeholder]}>{unwrap(config.headerLabel)}</Text>
            </View>
        )
    }

    return (
        <View style={[{ minHeight: 60 }]}>
            <Tags 
                disabled={config.disabled}
                dark={config.props.dark}
                verticalMargin={12} 
                tags={config.val().map(t => config.props.optionToLabel(t)) || []}
                onTagDeleted={config.disabled ? null : config.props.onTagDeleted}/>
        </View>
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
        fontSize: 18
    }
})