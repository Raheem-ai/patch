import { StyleSheet, Text, View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';

export default function SignInForm() {
    const [text, setText] = React.useState('');

    const onChangeText = (text: string) =>setText(text);

    return(
        <View style={styles.container}>
            <TextInput label="Username" onChangeText={onChangeText}/>
            <TextInput label="Passwsord" onChangeText={onChangeText}/>
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
