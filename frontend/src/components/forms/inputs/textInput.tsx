import { observer } from "mobx-react";
import React from "react";
import { TextInput as RNTextInput, StyleSheet } from "react-native";
import { unwrap } from "../../../../../common/utils";
import { SectionInlineViewProps } from "../types";


const TextInput = observer(({ config }: SectionInlineViewProps<'TextInput'>) => {
    return (
        
            <RNTextInput 
                style={[
                    { 
                        fontSize: styles.label.fontSize,
                        flex: 1
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
        fontSize: 16
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