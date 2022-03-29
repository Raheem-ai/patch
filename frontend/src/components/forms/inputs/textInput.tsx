import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { unwrap } from "../../../../../common/utils";
import { useKeyboard } from "../../../hooks/useKeyboard";
import { HeaderHeight } from "../../header/header";
import { SectionScreenViewProps, SectionInlineViewProps } from "../types";
import BackButtonHeader from "./backButtonHeader";


const TextInput = observer(({ config }: SectionInlineViewProps<'TextInput'>) => {
    return (
        <RNTextInput 
            style={[
                { 
                    lineHeight: styles.label.lineHeight, 
                    fontSize: styles.label.fontSize 
                }, 
                config.disabled ? styles.disabled : null
            ]}
            placeholder={unwrap(config.placeholderLabel)}
            editable={!config.disabled}
            selectTextOnFocus={!config.disabled}
            value={config.val()}
            onChangeText={(s: string) => config.onChange?.(s)}/>
    )
})

export default TextInput;

const styles = StyleSheet.create({
    label: {
        color: '#000',
        lineHeight: 24,
        fontSize: 18
    },
    notes: {
        flex: 1,
    }, 
    notesContainer: {
        flex: 1
    },
    disabled: {
        // opacity: .8,
    }
})