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
                <Image source={logo} style={{ width: 100, height: 100 }} /> 
            </View>
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>PATCH</Text>
            </View>
            <View style={[styles.captionContainer, {marginBottom: 100}]}>
                <Text style={styles.captionText}>The life-affirming dispatch system for community responders</Text>
            </View>
            <Pressable onPress={() => navigateTo(routerNames.signIn)}>
                <View style={styles.captionContainer}>
                    <Text style={styles.signInText}>SIGN IN</Text>
                </View>
            </Pressable>
            <Pressable onPress={() => navigateTo(routerNames.joinOrganization)}>
                <View style={styles.captionContainer}>
                    <Text style={styles.invitationCodeText}>ENTER INVITATION CODE</Text>
                </View>
            </Pressable>
        </View>
    );
})

export default LandingPage;

const styles = StyleSheet.create({
    pageContainer: {
        padding: 24,
        backgroundColor: '#42384F',
        height: '100%'
    },
    logoContainer: {
        marginTop: 100,
        height: 100,
        width: 100,
        alignContent: 'center',
        justifyContent: 'center',
        borderRadius: 100,
        alignSelf: 'center'
    },
    titleContainer: {
        alignSelf: 'center',
        paddingTop: 24
    },
    titleText: {
        fontSize: 48,
        fontWeight: '400',
        color: '#8B5BC7'
    },
    captionContainer: {
        alignSelf: 'center',
        width: 325,
        marginVertical: 32
    },
    captionText: {
        fontSize: 18,
        fontWeight: '400',
        color: '#FFFFFF80',
        textAlign: 'center'
    },
    signInText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B5BC7',
        textAlign: 'center'
    },
    invitationCodeText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#8B5BC7',
        textAlign: 'center'
    },
})