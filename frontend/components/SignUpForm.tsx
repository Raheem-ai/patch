import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';

export default function SignUpForm({ navigation }) {
    const [text, setText] = React.useState('');

    const onChangeText = (text: string) =>setText(text);

    return(
        <View>
            <TextInput label="First Name" onChangeText={onChangeText}/>
            <TextInput label="Last Name" onChangeText={onChangeText}/>
            <TextInput label="Email" onChangeText={onChangeText}/>
            <TextInput label="Password" onChangeText={onChangeText}/>
            <Button mode="contained" onPress={() => navigation.navigate('UserHomePage')}>Create Account</Button>
        </View>
    );
};