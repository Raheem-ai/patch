import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { HeaderHeight } from "../../header/header";
import { SectionScreenProps } from "../types";
import BackButtonHeader from "./backButtonHeader";


const TextAreaInput = observer(({ back, config }: SectionScreenProps<'TextArea'>) => {

    const [val, setVal] = useState(config.val())

    const save = () => {
        config.onSave?.(val);
        back();
    }

    const dimensions = Dimensions.get('screen');
    const keyboardHeight = useKeyboard()

    const targetHeight = dimensions.height - HeaderHeight - keyboardHeight;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
            style={styles.notesContainer}>
            <View style={{ height: targetHeight }}>
                <BackButtonHeader  back={back} save={save} label={config.headerLabel} />
                <View style={styles.notes}>
                    <RNTextInput 
                        style={{ lineHeight: styles.label.lineHeight, fontSize: styles.label.fontSize }}
                        multiline
                        autoFocus
                        value={val}
                        onChangeText={(s: string) => setVal(s)}/>
                </View>
            </View>
        </KeyboardAvoidingView>
    )
})

export default TextAreaInput;

const styles = StyleSheet.create({
    label: {
        color: '#000',
        maxHeight: 120,
        paddingVertical: 12,
        lineHeight: 24,
        fontSize: 18
    },
    notes: {
        flex: 1,
        padding: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    }, 
    notesContainer: {
        flex: 1
    }
})