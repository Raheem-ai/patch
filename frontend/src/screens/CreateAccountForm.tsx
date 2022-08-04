import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { CreateAccountNavigationProp, labelNames, routerNames } from '../types';
import { navigateTo } from '../navigation';

type Props = {
    navigation: CreateAccountNavigationProp;
};

export default function CreateAccountForm( { navigation } : Props) {
    const [firstname, setFirstname] = React.useState('');
    const [lastname, setLastname] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [secureTextEntry, setSecureTextEntry] = React.useState(true);

    return(
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>Create an account</Text>
                </View>
                <View style={styles.inputsContainer}>
                    <View style={styles.nameInputsContainer}>
                        <TextInput
                            mode="flat"
                            style={[styles.nameInput, { marginRight: 16 }]}
                            label={labelNames.firstname}
                            value={firstname}
                            onChangeText={firstname => setFirstname(firstname)}/>
                        <TextInput
                            mode="flat"
                            style={styles.nameInput}
                            label={labelNames.lastname}
                            value={lastname}
                            onChangeText={lastname => setLastname(lastname)}/>
                    </View>
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
                    <Button uppercase={false} color={'#fff'} style={styles.createAccountButton}>{'Create account'}</Button>
                    <Text style={styles.signInText} onPress={() => navigateTo(routerNames.signIn)}>SIGN IN</Text>
                </View>
            </View>
        </Pressable>
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
    nameInputsContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        width: 296
    },
    nameInput: {
        backgroundColor: '#FAF9FA',
        width: 140
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 32
    },
    createAccountButton: {
        borderRadius: 24,
        backgroundColor: '#76599A',
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
        marginBottom: 30,
        
        /* identical to box height, or 171% */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        
        /* primary.00 - 66% */
        color: 'rgba(105, 79, 112, 0.66)',
    },
    signInText: {
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