import React, { useState } from "react";
import { StyleSheet, NativeSyntheticEvent, TextInputSubmitEditingEventData, Text, View, TextStyle } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { TextInputProps } from "react-native-paper/lib/typescript/components/TextInput/TextInput";
import { Colors, ICONS } from "../types";
import STRINGS from "../../../common/strings";

type Props = {
    testID: string
    value: string
    label?: string
    password?: boolean
    errorText?: string
    style?: TextStyle
    keyboardType?: KeyboardType
    nativeRef?: typeof PaperTextInput
    onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void
    onChangeText?: (s: string) => void
}

export type KeyboardType = 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad';

const ValidatableTextInput = ( props: Props) => {

    const [secureTextEntry, setSecureTextEntry] = React.useState(!!props.password);

    const isPassword = !!props?.password ? props?.password : false;

    return(
        <View>
            <PaperTextInput
                testID={props.testID ? props.testID : null}
                mode="flat"
                secureTextEntry={secureTextEntry}
                right={!isPassword
                    ? null
                    : <PaperTextInput.Icon
                        name={secureTextEntry ? ICONS.showPassword : ICONS.hidePassword}
                        forceTextInputFocus={false}
                        onPress={() => {
                            setSecureTextEntry(!secureTextEntry);
                            return false;
                        }}
                        color={Colors.icons.dark}/>
                }
                style={[styles.input, props.style ? props.style : null]}
                label={props.label}
                value={props.value}
                keyboardType={props.keyboardType}
                onChangeText={(s: string) => props.onChangeText?.(s)}
                onSubmitEditing={(e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => props.onSubmitEditing?.(e)}
            />
            {props.errorText?.length == 0 ? null : <Text style={styles.errorMessage}>{props.errorText}</Text>}
        </View>
    )
}

export default ValidatableTextInput;


const styles = StyleSheet.create({
    input: {
        backgroundColor: Colors.backgrounds.signIn,
    },
    errorMessage: {
        color: 'red',
        paddingLeft: 12,
        paddingTop: 8,
        fontSize: 12
    }
})