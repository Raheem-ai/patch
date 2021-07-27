import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { NavigationStackProp } from 'react-navigation-stack';
import { routerNames, SignInNavigationProp } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';

type Props = {
    navigation: SignInNavigationProp;
};

export default function SignInForm( { navigation } : Props) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    return(
        <View>
            <TextInput label="Username" value={username} onChangeText={username => setTextUser(username)}/>
            <TextInput label="Passwsord" value={password} onChangeText={password =>setPassword(password)}/>
            <Button mode="contained" onPress={() => navigation.navigate(routerNames.userHome)}>Sign In</Button>
        </View>
    );
};