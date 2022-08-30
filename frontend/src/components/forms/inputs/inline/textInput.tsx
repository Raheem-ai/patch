import { observer } from "mobx-react";
import React, { Ref } from "react";
import { TextInput as RNTextInput, View, StyleSheet, TextStyle, NativeSyntheticEvent, TextInputSubmitEditingEventData } from "react-native";
import { TextInput as PaperTextInput } from "react-native-paper";
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

    const [secureTextEntry, setSecureTextEntry] = React.useState(true);

    return config.props?.password
        ? (
            <View 
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    backgroundColor: '#fff',
                    paddingRight: 36,
                }}>
                <RNTextInput 
                    placeholderTextColor={'#aaa'}
                    style={[
                        { 
                            fontSize: styles.label.fontSize,
                            width: '100%'
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
                    secureTextEntry={secureTextEntry}/>
                <PaperTextInput.Icon
                    name={!secureTextEntry ? 'eye' : 'eye-off'}
                    onPress={() => {
                        setSecureTextEntry(!secureTextEntry);
                        return false;
                    }}
                    color={Colors.icons.dark}
                    style={{
                        position: 'relative',
                        right: 12,
                    }}/>
            </View>
        )
        : (        
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
                keyboardType={config.props?.inputType}
                autoCorrect={!disableAutoCorrect}
                placeholder={unwrap(config.placeholderLabel)}
                editable={!config.disabled}
                selectTextOnFocus={!config.disabled}
                value={config.val()}
                onChangeText={(s: string) => config.onChange?.(s)}
                onSubmitEditing={onSubmitEditing || null}
                secureTextEntry={false}
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