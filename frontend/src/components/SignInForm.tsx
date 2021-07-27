import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { NavigationStackProp } from 'react-navigation-stack';

export default function SignInForm({ navigation }) {
    const [textUser, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    const onChangeText = (parameter: string) => {
        if (parameter === 'user') {
            setTextUser(textUser);
        } else if (parameter === "password") {
            setPassword(password);
        }
    };

    return(
        <View>
            <TextInput label="Username" onChangeText={() => onChangeText('user')}/>
            <TextInput label="Passwsord" onChangeText={() => onChangeText('password')}/>
            <Button mode="contained" onPress={() => navigation.navigate('UserHomePage')}>Sign In</Button>
        </View>
    );
};