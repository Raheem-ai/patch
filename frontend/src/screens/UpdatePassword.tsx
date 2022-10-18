import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { routerNames, Colors } from '../types';
import { alertStore, userStore } from '../stores/interfaces';
import { navigateTo, navigationRef } from '../navigation';
import { resolveErrorMessage } from '../errors';
import { ScrollView } from 'react-native-gesture-handler';
import STRINGS from '../../../common/strings';
import ValidatableTextInput from '../components/validatableTextInput';
import KeyboardAwareArea from '../components/helpers/keyboardAwareArea';
import { isPasswordValid } from '../../../common/constants';

export default function UpdatePasswordForm() {
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [passwordIsValid, setEmailIsValid] = useState(true);

    useEffect(() => {
        const res = isPasswordValid(password);
        setErrorMessage(res.isValid || password.length == 0 
            ? null 
            : res.msg);
        setEmailIsValid(res.isValid);
      }, [password]);

    const updatePassword = async () => {

        if (!passwordIsValid) {
            alertStore().toastError(errorMessage, true, true);
            return
        }

        try {
            await userStore().updatePassword(password);
        } catch(e) {
            alertStore().toastError(resolveErrorMessage(e), true, true);
            return
        }

        alertStore().toastSuccess(STRINGS.ACCOUNT.passwordUpdated, false, true);
        setTimeout(() => {
            navigateTo(routerNames.userHomePage);
        } , 1000);
    }

    const cancel = async () => {
        if(!!userStore().passwordResetLoginCode) {
            userStore().signOut();
        } else {
            navigationRef.current.goBack();
        }
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
                            <Text style={styles.titleText}>{STRINGS.PAGE_TITLES.updatePasswordFor(userStore().user.email)}</Text>
                        </View>
                        <View style={styles.inputsContainer}>
                            <ValidatableTextInput
                                password={true}
                                style={styles.input}
                                label={STRINGS.INTERFACE.password}
                                value={password}
                                errorText={errorMessage}
                                onChangeText={password => setPassword(password)}
                                onSubmitEditing={updatePassword}/>
                        </View>
                        <View style={styles.bottomContainer}>
                            <Button uppercase={false} color={Colors.text.buttonLabelPrimary} style={styles.signInButton} onPress={updatePassword}>{STRINGS.ACCOUNT.updatePasswordButton}</Button>
                            <Text onPress={cancel} style={styles.cancelLink}>Cancel</Text>
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