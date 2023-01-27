import { observer } from "mobx-react";
import React, { Ref } from "react";
import { TextInput as RNTextInput, View, StyleSheet, TextStyle, NativeSyntheticEvent, TextInputSubmitEditingEventData } from "react-native";
import { IconButton } from "react-native-paper";
import { unwrap } from "../../../../../../common/utils";
import { SectionInlineViewProps } from "../../types";
import { Colors, ICONS } from "../../../../types";

type Props = SectionInlineViewProps<'TextInput'> & {
    style?: TextStyle,
    onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void,
    dontBlurOnSubmit?: boolean,
    disableAutoCorrect?: boolean,
    nativeRef?: Ref<RNTextInput>,
}

const TextInput = observer(({ 
    config, 
    style,
    onSubmitEditing,
    dontBlurOnSubmit,
    disableAutoCorrect,
    nativeRef,
}: Props) => {

    const [secureTextEntry, setSecureTextEntry] = React.useState(true);
    const isPassword = !!config.props?.password ? config.props?.password : false;
    const inlineAction = config.props?.inlineAction;

    return (
            <View 
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    marginRight: 12,
                }}>
                <RNTextInput
                    testID={config.testID}
                    placeholderTextColor={Colors.text.tertiary}
                    style={[
                        { 
                            fontSize: styles.label.fontSize,
                            flex: 1,
                            width: '100%',
                            marginRight: 12,
                        }, 
                        config.disabled ? styles.disabled : null,
                        style || null
                    ]}
                    ref={nativeRef}
                    keyboardType={config.props?.inputType}
                    autoCorrect={!disableAutoCorrect}
                    placeholder={unwrap(config.placeholderLabel)}
                    editable={!config.disabled}
                    selectTextOnFocus={!config.disabled}
                    value={config.val()}
                    onChangeText={(s: string) => config.onChange?.(s)}
                    onSubmitEditing={onSubmitEditing || null}
                    blurOnSubmit={!dontBlurOnSubmit}
                    secureTextEntry={
                        isPassword 
                            ? secureTextEntry 
                            : false }/>
                { isPassword
                    ? <IconButton
                        icon={secureTextEntry ? ICONS.showPassword : ICONS.hidePassword}
                        onPress={() => {
                            setSecureTextEntry(!secureTextEntry);
                            return false;
                        }}
                        color={Colors.icons.dark}
/>
                    : null }
                { inlineAction
                    ? <IconButton
                        icon={inlineAction.icon}
                        onPress={inlineAction.action}
                        color={Colors.primary.alpha}
                        style={{margin: 0, marginRight: -4, borderRadius: 0}}
/>
                    : null }
            </View>
        )
})

export default TextInput;

const styles = StyleSheet.create({
    label: {
        color: Colors.text.default,
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
        // fontFamily: 'monospace'
    }
})
