import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { routerNames, SignInNavigationProp, Colors, ICONS } from '../types';
import { alertStore, notificationStore, userStore } from '../stores/interfaces';
import { navigateTo } from '../navigation';
import { resolveErrorMessage } from '../errors';
import { ScrollView } from 'react-native-gesture-handler';
import STRINGS from '../../../common/strings';

type Props = {
    navigation: SignInNavigationProp;
};

export default function SignInForm( { navigation } : Props) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [secureTextEntry, setSecureTextEntry] = React.useState(true);

    const signIn = async () => {

        try {
            await userStore().signIn(username, password)
        } catch(e) {
            alertStore().toastError(resolveErrorMessage(e), false, true)
            return
        }

        navigateTo(routerNames.userHomePage)
    }

    return(
        <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable onPress={Keyboard.dismiss} accessible={false} style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} keyboardShouldPersistTaps='always' keyboardDismissMode="none">
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Welcome to Patch!</Text>
                    </View>
                    <View style={styles.inputsContainer}>
                        <TextInput
                            mode="flat"
                            style={styles.input}
                            label={STRINGS.INTERFACE.email}
                            value={username}
                            keyboardType='email-address'
                            onChangeText={username => setTextUser(username)}/>
                        <TextInput
                            mode="flat"
                            secureTextEntry={secureTextEntry}
                            right={
                                <TextInput.Icon
                                name={secureTextEntry ? ICONS.showPassword : ICONS.hidePassword}
                                forceTextInputFocus={false}
                                onPress={() => {
                                    setSecureTextEntry(!secureTextEntry);
                                    return false;
                                }}
                                color={Colors.icons.dark}
                                />
                            }
                            style={styles.input}
                            label={STRINGS.INTERFACE.password}
                            value={password}
                            onChangeText={password =>setPassword(password)}
                            onSubmitEditing={signIn}/>
                    </View>
                    <View style={styles.bottomContainer}>
                        <Button uppercase={false} color={Colors.text.buttonLabelPrimary} style={styles.signInButton} onPress={signIn}>{'Sign in'}</Button>
                        {/* 
                        // TO DO: enable forgot your password
                        <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                        <Text style={styles.invitationCodeText} onPress={() => navigateTo(routerNames.joinOrganization)}>Enter invitation code</Text>
                        */}
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
        paddingTop: 200,
        paddingBottom: 100,
    },
    titleText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 21,
        lineHeight: 25,
        textAlign: 'center',
        color: Colors.text.signInTitle
    },
    inputsContainer: {
        alignSelf: 'center',
        marginBottom: 48,
        height: 50,
        width: 296
    },
    input: {
        backgroundColor: Colors.backgrounds.signIn,
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 48
    },
    signInButton: {
        borderRadius: 24,
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        marginVertical: 24,
        width: 296,
        height: 48
    },
    forgotPasswordText: {
        fontStyle: 'normal',
        fontWeight: '400',
        fontSize: 14,
        lineHeight: 24,
        color: Colors.text.buttonLabelSecondary,
        marginBottom: 24,
        
        /* identical to box height, or 171% */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center'     
    },
    invitationCodeText: {
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