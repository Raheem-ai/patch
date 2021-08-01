import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import * as React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { routerNames, SignInNavigationProp, SignUpNavigationProp } from "../types";
import { styles } from "/Users/rebeccapattichis/Desktop/internships/raheem/patch/frontend/src/style";


// IMPORTANT NOTE: what should the type of navigation be when there are multiple routes?
type Props = {
    navigation: SignInNavigationProp;
};

export default function WelcomePage({ navigation }: Props) {
    return (
        <View>
            <Text style={styles.title}>Welcome to Patch by Raheem!</Text>
            <Button style={styles.fitToText} mode="contained" onPress={() => navigation.navigate(routerNames.signIn)}>Sign In</Button> 
            <Button style={styles.fitToText} mode="contained" onPress={() => navigation.navigate(routerNames.signUp)}>Sign Up</Button>
        </View> 
    );
};
