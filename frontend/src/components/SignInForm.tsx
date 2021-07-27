import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { NavigationStackProp } from 'react-navigation-stack';

export default function SignInForm({ navigation }) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    return(
        <View>
            <TextInput label="Username" value={username} onChangeText={username => setTextUser(username)}/>
            <TextInput label="Passwsord" value={password} onChangeText={password =>setPassword(password)}/>
            <Button mode="contained" onPress={() => navigation.navigate('UserHomePage')}>Sign In</Button>
        </View>
    );
};