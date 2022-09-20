import { observer } from "mobx-react";
import React, { useState } from "react";
import { View, Switch, StyleSheet, ScrollView } from "react-native";
import { List, Text } from "react-native-paper";
import { unwrap } from "../../../../../../common/utils";
import { Colors, ICONS } from "../../../../types";
import { SectionInlineViewProps } from "../../types";

export type InlineListInputProps = SectionInlineViewProps<'InlineList'>

const InlineListInput = observer(({ config }: InlineListInputProps) => {
    const [vals, setVals] = useState(new Set(config.val()))

    const multiSelect = config.props.multiSelect;

    const toggleVal = (val) => {
        const cpy = new Set(vals)
        
        if (cpy.has(val)) {
            const lastAndNecessary = (config.props.onlyAddative && (cpy.size == 1))
            
            if (!lastAndNecessary) {
                cpy.delete(val);
            }
        } else {
            if (!multiSelect) {
                cpy.clear()
            }

            cpy.add(val)
        }

        setVals(cpy);
        config.onChange(Array.from(cpy.values()));
    }
    
    return (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1}}> 
            <List.Section style={{margin: 0}}>
                {config.props.options.map(opt => {
                    const chosen = vals.has(opt);
                    
                    const title = config.props.optionToListLabel
                        ? config.props.optionToListLabel(opt)
                        : config.props.optionToPreviewLabel(opt);

                    return <List.Item 
                                key={opt} 
                                onPress={() => toggleVal(opt)} 
                                title={title}
                                titleNumberOfLines={2}
                                titleStyle={chosen ? styles.chosenItem : styles.noop}
                                style={styles.item}
                                right={chosen ? props => <List.Icon color={'#000'} icon={ICONS.selectListItem} style={styles.rightCheckIcon}/> : null}/>
                })}
            </List.Section>
        </ScrollView>
    )
})

export default InlineListInput;

const styles = StyleSheet.create({
    item: {
        paddingLeft: 30
    },
    chosenItem: {
        fontWeight: 'bold'
    }, 
    noop: {
        // flexWrap: 'wrap'
    }, 
    rightCheckIcon: {
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        height: 20
    },
})