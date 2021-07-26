import { StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import * as React from "react";
import { NavigationContainer } from '@react-navigation/native';

export default function WelcomePage({ navigation }) {
    return (
        <View style={styles.container}>
            <Text>Welcome to Patch by Raheem!</Text>
            <Button mode="contained" onPress={() => navigation.navigate('SignIn')}>Sign In</Button> 
            <Button mode="contained" onPress={() => navigation.navigate('SignUp')}>Sign Up</Button>
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
