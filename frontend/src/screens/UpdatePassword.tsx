import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { routerNames, Colors, ICONS } from '../types';
import { alertStore, userStore } from '../stores/interfaces';
import { navigateTo, navigationRef } from '../navigation';
import { resolveErrorMessage } from '../errors';
import { ScrollView } from 'react-native-gesture-handler';
import STRINGS from '../../../common/strings';
import ValidatableTextInput from '../components/validatableTextInput';

export default function UpdatePasswordForm() {
    const [password, setPassword] = React.useState('');
    const [secureTextEntry, setSecureTextEntry] = React.useState(true);

    const updatePassword = async () => {
        if (password.length < 1) {
            // TODO:
            // set a minimum length (and, potentially other requirements?)
            // if it fails, let the user know it failed and why
            return
        }

        try {
            await userStore().updatePassword(password);
        } catch(e) {
            alertStore().toastError(resolveErrorMessage(e), false, false);
            return
        }

        alertStore().toastSuccess(STRINGS.ACCOUNT.passwordUpdated);
        setTimeout(() => navigateTo(routerNames.userHomePage), 1000)
    }

    return(
        <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} keyboardShouldPersistTaps='always' keyboardDismissMode="none">
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>{STRINGS.PAGE_TITLES.updatePassword}</Text>
                    </View>
                    <View style={styles.inputsContainer}>
                        <ValidatableTextInput
                            password={true}
                            style={styles.input}
                            label={STRINGS.INTERFACE.password}
                            value={password}
                            errorText={ (password.length >= 4 || password.length == 0) ? null : STRINGS.ACCOUNT.passwordTooShort }
                            onChangeText={password => setPassword(password)}
                            onSubmitEditing={updatePassword}/>
                    </View>
                    <View style={styles.bottomContainer}>
                        <Button uppercase={false} color={Colors.text.buttonLabelPrimary} style={styles.signInButton} onPress={updatePassword}>{STRINGS.ACCOUNT.updatePasswordButton}</Button>
                        <Text onPress={navigationRef.current.goBack} style={styles.cancelLink}>Cancel</Text>
                    </View>
                </ScrollView>
            </Pressable>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.signIn,
        flex: 1
    },
    scrollContainer: {
        padding: 24
    },
    titleContainer: {
        alignSelf: 'center',
        paddingTop: 80,
        marginBottom: 64
    },
    titleText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 21,
        lineHeight: 25,
        textAlign: 'center',
        color: Colors.text.signInTitle,
    },
    inputsContainer: {
        alignSelf: 'center',
        marginBottom: 24,
        width: 296
    },
    input: {
        backgroundColor: Colors.backgrounds.signIn,
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 12
    },
    signInButton: {
        borderRadius: 24,
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        marginVertical: 12,
        width: 296,
        height: 48
    },
    cancelLink: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 14,
        lineHeight: 16,
        color: Colors.text.buttonLabelSecondary,
        marginTop: 24,
        
        /* identical to box height */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
});