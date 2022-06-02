import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import * as React from 'react';
import { InvitationSuccessfulProp, routerNames } from '../types';
import { navigateTo } from '../navigation';

type Props = {
    navigation: InvitationSuccessfulProp;
};

export default function InvitationSuccessfulPage( { navigation } : Props) {
    return(
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>Invitation successful</Text>
            </View>
            <View style={styles.captionContainer}>
                <Text style={styles.captionText}>
                    <Text>Ready to join </Text>
                    <Text style={{color: '#76599A'}}>Community Response Team?</Text>
                </Text>
            </View>
            <View style={[styles.captionContainer, {marginBottom: 120}]}>
                <Text style={styles.captionText}>If you already havea a PATCH account, sign in. Otherwise, create an account.</Text>
            </View>

            <View style={styles.bottomContainer}>
                <Button mode='outlined' uppercase={false} color={'#76599A'} style={[styles.button, { marginBottom: 16 }]} onPress={() => navigateTo(routerNames.signIn)}>{'Sign in'}</Button>
                <Button mode='outlined' uppercase={false} color={'#76599A'} style={styles.button} onPress={() => navigateTo(routerNames.createAccount)}>{'Create Account'}</Button>
            </View>
        </View>
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
        paddingBottom: 16
    },
    titleText: {
        fontStyle: 'normal',
        fontWeight: '700',
        fontSize: 21,
        lineHeight: 25,
        textAlign: 'center',
        color: '#713EB0'
    },
    captionContainer: {
        alignSelf: 'center',
        width: 275,
        marginVertical: 16
    },
    captionText: {
        fontSize: 18,
        fontWeight: '400',
        color: 'rgba(105, 79, 112, 0.66)',
        textAlign: 'center'
    },
    bottomContainer: {
        alignSelf: 'center',
        marginVertical: 32
    },
    button: {
        borderRadius: 24,
        borderColor: '#76599A',
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        width: 296,
        height: 44
    },
});