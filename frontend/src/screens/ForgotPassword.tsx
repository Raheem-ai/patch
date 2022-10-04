import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { routerNames, Colors, ICONS } from '../types';
import { alertStore, userStore } from '../stores/interfaces';
import { navigationRef } from '../navigation';
import { resolveErrorMessage } from '../errors';
import { ScrollView } from 'react-native-gesture-handler';
import STRINGS from '../../../common/strings';
import ValidatableTextInput from '../components/validatableTextInput';
import KeyboardAwareArea from '../components/helpers/keyboardAwareArea';

import { isEmailValid } from '../../../common/constants';

export default function ForgotPasswordForm() {
    const [email, setEmail] = React.useState('');

    const res = isEmailValid(email);
    const errorMessage = res.isValid || email.length == 0 
        ? null 
        : res.msg

    const sendCode = async () => {
        if (!isEmailValid) {
            // TODO:
            // if it fails, let the user know it failed and why in a toast?
            return
        }

        try {
            // is there a user?
            // if so, construct and send code
        } catch(e) {
            alertStore().toastError(resolveErrorMessage(e), false, false);
            return
        }

        alertStore().toastSuccess(STRINGS.ACCOUNT.resetPasswordCodeSent);
        setTimeout(() => navigationRef.current.goBack(), 1000); // delay to ease transition
    }

    return(
        // TODO
        // Setting the background color here to hide the fact that an extra space is added
        // but the error message is not visible so need to fix KeyboardAwareArea: 
        // https://linear.app/raheem/issue/RAH-632/keyboardavoidingview-not-working-on-updatepassword
        <View style={{height: '100%', backgroundColor: Colors.backgrounds.signIn}}>
            <KeyboardAwareArea>
                <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.container}>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} keyboardShouldPersistTaps='always' keyboardDismissMode="none">
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>{STRINGS.PAGE_TITLES.forgotPassword}</Text>
                        </View>
                        <View style={styles.inputsContainer}>
                            <ValidatableTextInput
                                style={styles.input}
                                label={STRINGS.INTERFACE.email}
                                value={email}
                                errorText={errorMessage}
                                onChangeText={email => setEmail(email)}
                                onSubmitEditing={sendCode}/>
                        </View>
                        <View style={styles.bottomContainer}>
                            <Button uppercase={false} color={Colors.text.buttonLabelPrimary} style={styles.signInButton} onPress={sendCode}>{STRINGS.ACCOUNT.forgotPasswordButton}</Button>
                            <Text onPress={navigationRef.current.goBack} style={styles.cancelLink}>Cancel</Text>
                        </View>
                    </ScrollView>
                </Pressable>
            </KeyboardAwareArea>
        </View>
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
        paddingTop: 280,
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