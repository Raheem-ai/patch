import { StyleSheet, Text, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';

export default function SignUpForm() {
    const [text, setText] = React.useState('');

    const onChangeText = (text: string) =>setText(text);

    return(
        <View style={styles.container}>
            <TextInput label="First Name" onChangeText={onChangeText}/>
            <TextInput label="Last Name" onChangeText={onChangeText}/>
            <TextInput label="Email" onChangeText={onChangeText}/>
            <TextInput label="Password" onChangeText={onChangeText}/>
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
