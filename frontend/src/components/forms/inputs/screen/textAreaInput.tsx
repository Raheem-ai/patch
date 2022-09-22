import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { HeaderHeight } from "../../../../constants";
import { useKeyboard } from "../../../../hooks/useKeyboard";
import KeyboardAwareArea from "../../../helpers/keyboardAwareArea";
import { SectionScreenViewProps } from "../../types";
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader";


const TextAreaInput = observer(({ back, config }: SectionScreenViewProps<'TextArea'>) => {

    const [val, setVal] = useState(config.val())

    const save = () => {
        config.onSave(val);
        back();
    }

    const cancel = () => {
        config.onCancel?.()
        back();
    }

    const dimensions = Dimensions.get('screen');
    const keyboardHeight = useKeyboard()

    const targetHeight = dimensions.height - HeaderHeight - keyboardHeight;

    const headerProps: BackButtonHeaderProps = {
        cancel: {
            handler: cancel
        },
        save: {
            handler: save
        },
        label: config.headerLabel
    }

    const charLimitIndicator = () => {
        if (!config.props?.maxChar) {
            return null;
        }

        const current = val.length;
        const max = config.props.maxChar;

        return (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Text>{`${current}/${max}`}</Text>
            </View>
        )
    }

    return (
        <KeyboardAwareArea style={styles.notesContainer}>
            <View style={{ flex: 1 }}>
                <BackButtonHeader  {...headerProps} />
                <View style={styles.notes}>
                    { charLimitIndicator() }
                    <RNTextInput 
                        style={{ lineHeight: styles.label.lineHeight, fontSize: styles.label.fontSize }}
                        maxLength={config.props?.maxChar}
                        multiline
                        autoFocus
                        value={val}
                        onChangeText={(s: string) => {
                            const newValue = config.textTransform ? config.textTransform(s) : s;
                            setVal(newValue)
                        }}/>
                </View>
            </View>
        </KeyboardAwareArea>
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