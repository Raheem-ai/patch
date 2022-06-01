import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { labelNames, routerNames, ScreenProps } from '../types';
import { navigateTo } from '../navigation';

type Props = ScreenProps<'JoinOrganization'>;

export default function JoinOrganizationForm( { navigation } : Props) {
    const [inivitationCode, setInvitationCode] = React.useState('');

    return(
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                <Button uppercase={false} color={'#fff'} style={styles.invitationCodeButton}>{'Enter invitation code'}</Button>
                <Text style={styles.signInText}  onPress={() => navigateTo(routerNames.signIn)}>SIGN IN</Text>
            </View>
        </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        /* flex: 1,*/
        // justifyContent: 'center',
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
        fontWeight: '400',
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
    invitationCodeButton: {
        borderRadius: 24,
        backgroundColor: '#76599A',
        justifyContent: 'center',
        marginVertical: 24,
        width: 296,
        height: 44
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