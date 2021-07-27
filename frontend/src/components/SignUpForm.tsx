import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { RootStackParamList, routerNames } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';

export default function SignUpForm({ navigation }) {
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    return(
        <View>
            <TextInput label="First Name" value={firstName} onChangeText={firstName => setFirstName(firstName)}/>
            <TextInput label="Last Name" value={lastName} onChangeText={lastName => setLastName(lastName)}/>
            <TextInput label="Email" value={email} onChangeText={email => setEmail(email)}/>
            <TextInput label="Password" value={password} onChangeText={password => setPassword(password)}/>
            <Button mode="contained" onPress={() => navigation.navigate(routerNames.userHome)}>Create Account</Button>
        </View>
    );
};