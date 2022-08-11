import React from "react";
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { red100 } from "react-native-paper/lib/typescript/styles/colors";
import { Colors } from "../types";

export type PatchButtonProps = {
    label: string,
    width?: number | string,
    small?: boolean,
  } & Pick <React.ComponentProps<typeof Button>,
    'mode'
    | 'dark'
    | 'compact'
    | 'disabled'
    | 'uppercase'
    | 'accessibilityLabel'
    | 'contentStyle'
    | 'style'
    | 'labelStyle'
    | 'onPress'
  >;

const PatchButton = ( props:PatchButtonProps) => {
    const {
        label,
        width,
        small,
        ...rest
    } = props;

    const buttonStyle = rest.mode 
        ? rest.mode == 'outlined'
            ? styles.outlinedButton
            : rest.mode == 'contained'
                ? styles.containedButton
                : styles.textButton
        : styles.outlinedButton;

    const buttonLabelStyle = rest.mode 
        ? rest.mode == 'outlined'
            ? styles.outlinedButtonLabel
            : rest.mode == 'contained'
                ? styles.containedButtonLabel
                : styles.textButtonLabel
        : styles.outlinedButton;

    return(
        <Button 
            {...rest}
            style={[ 
                styles.button, 
                buttonStyle, 
                (width 
                    ? {width: width} 
                    : (buttonStyle == styles.textButton || small 
                        ? null 
                        : {width: '100%'})), 
                (small && styles.smallButton),
                rest.style ]}
            labelStyle={[ styles.buttonLabel, buttonLabelStyle, (small && styles.buttonLabelSmall) ]}
            accessibilityLabel={label}>{label}</Button>
    )
}

export default PatchButton;


const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 32,
        height: 48,
    },
    smallButton: {
        height: 36,
        width: null,
    },
    containedButton: {
        backgroundColor: Colors.primary.alpha,
    },
    outlinedButton: {
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: Colors.backgrounds.standard,
        borderColor: Colors.primary.alpha,
    },
    textButton: {
        backgroundColor: Colors.backgrounds.standard,
        borderColor: Colors.nocolor,
    },
    buttonLabel: {
        letterSpacing: 0.2,
        fontWeight: '600',
        fontSize: 16,
    },
    buttonLabelSmall: {
        fontSize: 14,
        textTransform: 'none',
    },
    containedButtonLabel: {
        color: Colors.text.defaultReversed,
    },
    outlinedButtonLabel: {
        color: Colors.primary.alpha,
    },
    textButtonLabel: {
        color: Colors.primary.alpha,
        textTransform: 'uppercase',
    },
})