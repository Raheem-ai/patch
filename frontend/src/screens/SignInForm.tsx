import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { labelNames, routerNames, SignInNavigationProp } from '../types';
import { alertStore, notificationStore, userStore } from '../stores/interfaces';
import { navigateTo } from '../navigation';
import { resolveErrorMessage } from '../errors';

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
            alertStore().toastError(resolveErrorMessage(e))
            return
        }

        setTimeout(() => {
            notificationStore().handlePermissions();
        }, 0);

        navigateTo(routerNames.userHomePage)
    }

    return(
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>Welcome back!</Text>
            </View>
            <View style={styles.inputsContainer}>
                <TextInput
                    mode="flat"
                    style={styles.input}
                    label={labelNames.email}
                    value={username}
                    onChangeText={username => setTextUser(username)}/>
                <TextInput
                    mode="flat"
                    secureTextEntry={secureTextEntry}
                    right={
                        <TextInput.Icon
                          name="eye"
                          onPress={() => {
                            setSecureTextEntry(!secureTextEntry);
                            return false;
                          }}
                        />
                      }
                    style={styles.input}
                    label={labelNames.password}
                    value={password}
                    onChangeText={password =>setPassword(password)}/>
            </View>
            <View style={styles.bottomContainer}>
                <Button uppercase={false} color={'#fff'} style={styles.signInButton} onPress={signIn}>{'Sign in'}</Button>
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                <Text style={styles.invitationCodeText} onPress={() => navigateTo(routerNames.joinOrganization)}>ENTER INVITATION CODE</Text>
            </View>
        </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#FAF9FA',
        height: '100%'
    },
    titleContainer: {
        alignSelf: 'center',
        paddingTop: 200,
        paddingBottom: 100
    },
    titleText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 21,
        lineHeight: 25,
        textAlign: 'center',
        color: '#713EB0'
    },
    inputsContainer: {
        alignSelf: 'center',
        marginBottom: 48,
        height: 50,
        width: 296
    },
    input: {
        backgroundColor: '#FAF9FA'
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 32
    },
    signInButton: {
        borderRadius: 24,
        backgroundColor: '#76599A',
        justifyContent: 'center',
        marginVertical: 24,
        width: 296,
        height: 44
    },
    forgotPasswordText: {
        fontStyle: 'normal',
        fontWeight: '400',
        fontSize: 14,
        lineHeight: 24,
        marginBottom: 30,
        
        /* identical to box height, or 171% */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        
        /* primary.00 - 66% */
        color: 'rgba(105, 79, 112, 0.66)',
    },
    invitationCodeText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 14,
        lineHeight: 16,
        
        /* identical to box height */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        textTransform: 'uppercase',
        
        /* primary.00 - 33% */
        color: 'rgba(118, 89, 154, 0.33)',
    },
});