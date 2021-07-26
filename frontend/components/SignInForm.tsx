import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';

export default function SignInForm({ navigation }) {
    const [text, setText] = React.useState('');

    const onChangeText = (text: string) =>setText(text);

    return(
        <View>
            <TextInput label="Username" onChangeText={onChangeText}/>
            <TextInput label="Passwsord" onChangeText={onChangeText}/>
            <Button mode="contained" onPress={() => navigation.navigate('UserHomePage')}>Sign In</Button>
        </View>
    );
};