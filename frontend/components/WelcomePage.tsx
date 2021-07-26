import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import * as React from "react";
import { Redirect, useHistory } from "react-router-dom";

export default function WelcomePage() {
    return (
        <View style={styles.container}>
            <Text>Welcome to Patch by Raheem!</Text>
            <Button mode="contained">Sign In</Button> 
            <Button mode="contained">Sign Up</Button>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
