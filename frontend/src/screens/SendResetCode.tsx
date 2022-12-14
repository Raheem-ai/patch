import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { routerNames, Colors, ICONS } from '../types';
import { alertStore, userStore, linkingStore } from '../stores/interfaces';
import { navigationRef } from '../navigation';
import { resolveErrorMessage } from '../errors';
import { ScrollView } from 'react-native-gesture-handler';
import STRINGS from '../../../common/strings';
import ValidatableTextInput from '../components/validatableTextInput';
import KeyboardAwareArea from '../components/helpers/keyboardAwareArea';

import { isEmailValid } from '../../../common/utils/validationUtils';
import { linkBaseUrl } from '../config';

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [emailIsValid, setEmailIsValid] = useState(true);

    useEffect(() => {
        const res = isEmailValid(email);
        setErrorMessage(res.isValid || email.length == 0 
            ? null 
            : res.msg);
        setEmailIsValid(res.isValid);
      }, [email]);

    const sendCode = async () => {

        if (!emailIsValid) {
            alertStore().toastError(STRINGS.ACCOUNT.emailProbablyNotRight, false, true);
            return
        }
        try {
            await userStore().sendResetCode(email, linkBaseUrl);
        } catch(e) {
            alertStore().toastError(resolveErrorMessage(e), true, true);
            return
        }
        
        alertStore().toastSuccess(STRINGS.ACCOUNT.resetPasswordCodeSent, false, true);
        setEmail('');
        setTimeout(() => navigationRef.current.goBack(), 1000); // delay to ease transition
    }

    return(
        // TODO
        // Setting the background color here to hide the fact that an extra space is added (if there's an activeRequest)
        // but the error message is not visible so need to fix KeyboardAwareArea: 
        // https://linear.app/raheem/issue/RAH-632/keyboardavoidingview-not-working-on-updatepassword
        <View style={{height: '100%', backgroundColor: Colors.backgrounds.signIn}}>
            <KeyboardAwareArea>
                <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.container}>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} keyboardShouldPersistTaps='always' keyboardDismissMode="none">
                        <View style={styles.titleContainer}>
                            <Text style={styles.titleText}>{STRINGS.PAGE_TITLES.forgotPassword}</Text>
                        </View>
                        <View style={styles.captionContainer}>
                            <Text style={styles.captionText}>
                                <Text>{STRINGS.PAGE_TITLES.forgotPasswordSubtitle}</Text>
                            </Text>
                        </View>
                        <View style={styles.inputsContainer}>
                            <ValidatableTextInput
                                style={styles.input}
                                label={STRINGS.INTERFACE.email}
                                value={email}
                                keyboardType='email-address'
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
        paddingTop: 160,
    },
    titleText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 21,
        lineHeight: 25,
        textAlign: 'center',
        color: Colors.text.signInTitle,
    },
    captionContainer: {
        alignSelf: 'center',
        width: 275,
        marginTop: 32,
        marginBottom: 64
    },
    captionText: {
        fontSize: 18,
        fontWeight: '400',
        color: 'rgba(105, 79, 112, 0.66)',
        textAlign: 'center'
    },
    inputsContainer: {
        alignSelf: 'center',
        marginBottom: 12,
        width: 296
    },
    input: {
        backgroundColor: Colors.backgrounds.signIn,
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 0
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