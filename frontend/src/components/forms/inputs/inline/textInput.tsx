import { observer } from "mobx-react";
import React, { Ref } from "react";
import { TextInput as RNTextInput, StyleSheet, TextStyle, NativeSyntheticEvent, TextInputSubmitEditingEventData } from "react-native";
import { unwrap } from "../../../../../../common/utils";
import { SectionInlineViewProps } from "../../types";
import { Colors } from "../../../../types";

type Props = SectionInlineViewProps<'TextInput'> & {
    style?: TextStyle
    onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void
    dontBlurOnSubmit?: boolean,
    disableAutoCorrect?: boolean,
    nativeRef?: Ref<RNTextInput>
}

const TextInput = observer(({ 
    config, 
    style,
    onSubmitEditing,
    dontBlurOnSubmit,
    disableAutoCorrect,
    nativeRef
}: Props) => {

    return (
        
            <RNTextInput 
                placeholderTextColor={'#aaa'}
                style={[
                    { 
                        fontSize: styles.label.fontSize,
                        flex: 1
                    }, 
                    config.disabled ? styles.disabled : null,
                    style || null
                ]}
                ref={nativeRef}
                keyboardType={config.inputType}
                autoCorrect={!disableAutoCorrect}
                placeholder={unwrap(config.placeholderLabel)}
                editable={!config.disabled}
                selectTextOnFocus={!config.disabled}
                value={config.val()}
                onChangeText={(s: string) => config.onChange?.(s)}
                onSubmitEditing={onSubmitEditing || null}
                blurOnSubmit={!dontBlurOnSubmit}/>
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
        color: Colors.text.disabled,
    }
})