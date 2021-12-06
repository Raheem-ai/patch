import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { List } from "react-native-paper";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { HeaderHeight } from "../../header/header";
import { SectionScreenProps } from "../types";
import BackButtonHeader from "./backButtonHeader";

const ListInput = observer(({ back, config }: SectionScreenProps<'List' | 'TagList'>) => {

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
            <List.Section style={{margin: 0}}>
                {config.props.options.map(opt => {
                    const chosen = vals.has(opt);

                    return <List.Item 
                                key={opt} 
                                onPress={() => toggleVal(opt)} 
                                title={config.props.optionToLabel(opt)}
                                titleStyle={chosen ? styles.chosenItem : styles.noop}
                                style={styles.item}
                                right={chosen ? props => <List.Icon color={'#000'} icon={'check'} style={styles.rightCheckIcon}/> : null}/>
                })}
            </List.Section>
        </>
    )
})

export default ListInput;

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