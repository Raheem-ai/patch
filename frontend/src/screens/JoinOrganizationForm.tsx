import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { JoinOrganizationNavigationProp, labelNames, routerNames, Colors, ScreenProps } from '../types';
import { navigateTo } from '../navigation';

type Props = {
    navigation: JoinOrganizationNavigationProp;
};

export default function JoinOrganizationForm( { navigation } : Props) {
    const [inivitationCode, setInvitationCode] = React.useState('');

    return(
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <View style={styles.titleContainer}>
                    <Text style={styles.titleText}>Join an organization</Text>
                </View>
                <View style={styles.inputsContainer}>
                    <TextInput
                        mode="flat"
                        style={styles.input}
                        label={labelNames.invitationCode}
                        value={inivitationCode}
                        onChangeText={inivitationCode => setInvitationCode(inivitationCode)}/>
                </View>
                <View style={styles.bottomContainer}>
                    <Button
                        uppercase={false}
                        color={Colors.text.buttonLabelPrimary}
                        style={styles.invitationCodeButton}
                        // TODO: Enable "Enter invitation Code" after invitation + create account flow is implemented.
                        disabled={true}
                        onPress={() => navigateTo(routerNames.invitationSuccessful)}>{'Enter invitation code'}</Button>
                    <Text
                        style={styles.signInText}
                        onPress={() => navigateTo(routerNames.signIn)}>Sign in</Text>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: Colors.backgrounds.signIn,
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
        color: Colors.text.signInTitle
    },
    inputsContainer: {
        alignSelf: 'center',
        height: 50,
        width: 296
    },
    input: {
        backgroundColor: Colors.backgrounds.signIn
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 32
    },
    invitationCodeButton: {
        borderRadius: 24,
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        marginVertical: 24,
        width: 296,
        height: 48
    },
    signInText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 14,
        lineHeight: 16,
        marginTop: 24,
        
        /* identical to box height */
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        textTransform: 'uppercase',

        color: Colors.text.buttonLabelSecondary
    },
});