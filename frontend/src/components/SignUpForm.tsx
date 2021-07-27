import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { RootStackParamList } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';

export default function SignUpForm({ navigation }) {
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const onChangeText = (parameter: string) => {
        if (parameter === 'firstname') {
            setFirstName(firstName);
        } else if (parameter === 'lastname') {
            setLastName(lastName);
        } else if (parameter === "email") {
            setEmail(email);
        } else if (parameter == "password") {
            setPassword(password);
        }
    };

    return(
        <View>
            <TextInput label="First Name" onChangeText={() => onChangeText('firstname')}/>
            <TextInput label="Last Name" onChangeText={() => onChangeText('lastname')}/>
            <TextInput label="Email" onChangeText={() => onChangeText('email')}/>
            <TextInput label="Password" onChangeText={() => onChangeText('password')}/>
            <Button mode="contained" onPress={() => navigation.navigate('UserHomePage')}>Create Account</Button>
        </View>
    );
};