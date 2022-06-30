import { observer } from "mobx-react";
import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { LandingPageNavigationProp, routerNames, ScreenProps } from "../types";
import logo from '../../assets/logo.png';
import { navigateTo } from "../navigation";

type Props = {
    navigation: LandingPageNavigationProp;
};

const LandingPage = observer(({ navigation }: Props) => {
    const [ loading, setLoading ] = useState(false)

    if (loading) {
        return null
    }

    return (
        <View style={styles.pageContainer}>
            <View style={styles.logoContainer}>
                <Image source={logo} style={{ width: 232, height: 73 }} /> 
            </View>
            <View style={[styles.captionContainer, {marginBottom: 200}]}>
                <Text style={styles.captionText}>The dispatch system for community crisis care</Text>
            </View>
            <Pressable onPress={() => navigateTo(routerNames.signIn)}>
                <View style={styles.captionContainer}>
                    <Text style={styles.signInText}>Sign in</Text>
                </View>
            </Pressable>
            <Pressable onPress={() => navigateTo(routerNames.joinOrganization)}>
                <View style={styles.captionContainer}>
                    <Text style={styles.invitationCodeText}>Enter invitation code</Text>
                </View>
            </Pressable>
        </View>
    );
})

export default LandingPage;

const styles = StyleSheet.create({
    pageContainer: {
        padding: 24,
        backgroundColor: '#53317C',
        height: '100%'
    },
    logoContainer: {
        marginTop: 150,
        height: 100,
        width: 232,
        alignContent: 'center',
        justifyContent: 'center',
        borderRadius: 100,
        alignSelf: 'center'
    },
    captionContainer: {
        alignSelf: 'center',
        width: 325,
        marginVertical: 24
    },
    captionText: {
        fontSize: 18,
        fontWeight: '400',
        color: '#FFFFFF80',
        textAlign: 'center'
    },
    signInText: {
        fontSize: 18,
        letterSpacing: 0.8,
        fontWeight: '700',
        color: '#F7F3FB',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    invitationCodeText: {
        fontSize: 18,
        letterSpacing: 0.8,
        fontWeight: '400',
        color: '#F7F3FB',
        textAlign: 'center',
        textTransform: 'uppercase'
    },
})