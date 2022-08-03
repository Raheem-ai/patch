import React from "react";
import { StyleSheet } from "react-native";
import { Button as RNButton } from "react-native-paper";
import { Colors } from "../types";
import STRINGS from "../../../common/strings"

type Props = React.ComponentProps<typeof RNButton> & {
    children: React.ReactNode,
}

const PatchButton = ({ 
    mode,
    onPress,
    children
}: Props) => {

    const uppercase = mode && mode === 'text'
        ? true
        : false;

    return (
        <RNButton 
            uppercase={uppercase}
            mode={mode}
            style={[styles.button, 
                (mode === 'outlined' 
                    ? styles.outlineButton
                    : (mode === 'text')
                        ? styles.textButton
                        : null
            )]}
            labelStyle={[styles.buttonLabel, 
                (mode === 'outlined' 
                    ? styles.outlineLabel
                    : (mode === 'text')
                        ? styles.textLabel
                        : null
            )]}
            color={Colors.primary.alpha}
            onPress={onPress}
            >
            {children}
        </RNButton>
    )
}

export default PatchButton;


const styles = StyleSheet.create({
    button: {
        borderRadius: 32,
        color: Colors.text.defaultReversed
    },
    buttonLabel: {

    },
    outlineButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
    },
    outlineLabel: {

    },
    textButton: {
        borderWidth: 0,
    },
    textLabel: {
        color: Colors.primary.alpha,
        fontWeight: '700',
    },
    disabled: {
        // opacity: .8,
        color: Colors.text.disabled,
    }
}) 