import { autoAction } from "mobx/dist/internal";
import React from "react";
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Button } from 'react-native-paper';
import { Colors, ICONS } from "../types";

export type PatchButtonProps = {
    label: string,
    width?: number | string,
    small?: boolean,
    style?: StyleProp<ViewStyle>
  } & Pick <React.ComponentProps<typeof Button>,
    'mode'
    | 'dark'
    | 'compact'
    | 'disabled'
    | 'uppercase'
    | 'accessibilityLabel'
    | 'contentStyle'
    | 'labelStyle'
    | 'onPress'
    | 'testID'
  >;

const PatchButton = ( props:PatchButtonProps) => {
    const {
        label,
        width,
        small,
        style,
        testID,
        ...rest
    } = props;


    let buttonStyle, buttonLabelStyle;

    switch(rest.mode) {
        case 'text':
            buttonStyle = styles.textButton;
            buttonLabelStyle = styles.textButtonLabel;
            break;
        case 'contained':
            buttonStyle = styles.containedButton;
            buttonLabelStyle = styles.containedButtonLabel;
            break;
        default:
            buttonStyle = styles.outlinedButton;
            buttonLabelStyle = styles.outlinedButtonLabel;
            break;
    }

    return(
        <Button 
            {...rest}
            testID={testID}
            sentry-label={testID}
            style={[ 
                styles.button, 
                (width 
                    ? {width: width} 
                    : (buttonStyle == styles.textButton || small 
                        ? null 
                        : {width: '100%'})), 
                (small && styles.smallButton),
                buttonStyle, 
                style ]}
            labelStyle={[ styles.buttonLabel, buttonLabelStyle, (small && styles.buttonLabelSmall), (props.labelStyle && props.labelStyle) ]}
            accessibilityLabel={label}>{label}</Button>
    )
}

export default PatchButton;


const styles = StyleSheet.create({
    button: {
        borderRadius: 32,
        paddingVertical: 8,
    },
    smallButton: {
        paddingVertical: 2,
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
        backgroundColor: Colors.nocolor,
        borderColor: Colors.nocolor,
        display: 'flex',
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 0,
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
        textAlign: 'left',
        marginLeft: 0
    },
})