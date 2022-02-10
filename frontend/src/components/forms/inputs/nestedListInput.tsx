import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { List } from "react-native-paper";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { HeaderHeight } from "../../header/header";
import { SectionScreenProps } from "../types";
import BackButtonHeader from "./backButtonHeader";

const NestedListInput = observer(({ back, config }: SectionScreenProps<'NestedList' | 'NestedTagList'>) => {

    const [vals, setVals] = useState(new Set(config.val()))

    const multiSelect = config.props.multiSelect;

    const save = () => {
        config.onSave(Array.from(vals.values()));
        back();
    }

    const toggleVal = (val) => {
        const cpy = new Set(vals)
        
        if (cpy.has(val)) {
            cpy.delete(val);
        } else {
            if (!multiSelect) {
                cpy.clear()
            }

            cpy.add(val)
        }

        setVals(cpy);
    }

    return (
        <>
            <BackButtonHeader  back={back} save={save} label={config.headerLabel} />
            <ScrollView style={{ flex: 1}}>
                <List.Section style={{margin: 0}}>
                    {config.props.categories.map((cat) => {

                        const items = config.props.optionsFromCategory(cat)
                                        .map(opt => {
                                            const chosen = vals.has(opt);

                                            const title = config.props.optionToListLabel
                                                ? config.props.optionToListLabel(opt)
                                                : config.props.optionToPreviewLabel(opt);

                                            return <List.Item 
                                                        key={opt} 
                                                        onPress={() => toggleVal(opt)} 
                                                        title={title}
                                                        titleStyle={chosen ? styles.chosenItem : styles.noop}
                                                        titleNumberOfLines={2}
                                                        style={styles.item}
                                                        right={chosen ? props => <List.Icon color={'#000'} icon={'check'} style={styles.rightCheckIcon}/> : null}/>
                                        })

                        return [   
                            <List.Subheader key='subheader' style={styles.item}>{config.props.categoryToLabel(cat)}</List.Subheader>,
                            ...items
                        ]
                    })}
                </List.Section>
            </ScrollView>
        </>
    )
})

export default NestedListInput;

const styles = StyleSheet.create({
    item: {
        paddingLeft: 30
    },
    chosenItem: {
        fontWeight: 'bold'
    }, 
    noop: {
        
    }, 
    rightCheckIcon: {
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        height: 20
    },
})