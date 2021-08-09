import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import * as React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { routerNames, SignInNavigationProp, SignUpNavigationProp, styleVals } from "../types";

// IMPORTANT NOTE: what should the type of navigation be when there are multiple routes?
type Props = {
    navigation: SignInNavigationProp;
};

export default function WelcomePage({ navigation }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Patch by Raheem!</Text>
            <View style={styles.fitToText}>
                <Button mode="contained" onPress={() => navigation.navigate(routerNames.signIn)}>Sign In</Button>
                <Button mode="contained" onPress={() => navigation.navigate(routerNames.signUp)}>Sign Up</Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: styleVals.fontSizes.large,
        fontWeight: "bold",
        textAlign: 'center',
    },
    fitToText: {
        flexDirection: "row",
        justifyContent: "space-evenly",
    },
});