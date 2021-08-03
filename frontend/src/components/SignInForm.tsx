import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput, Title } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { NavigationStackProp } from 'react-navigation-stack';
import { labelNames, routerNames, SignInNavigationProp } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { styles } from '../style';

type Props = {
    navigation: SignInNavigationProp;
};

export default function SignInForm( { navigation } : Props) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    return(
        <View style={styles.containerTest}>
            <Title style={styles.title}>Sign In</Title>
            <TextInput mode="outlined" label={labelNames.username} value={username} onChangeText={username => setTextUser(username)}/>
            <TextInput mode="outlined" label={labelNames.password} value={password} onChangeText={password =>setPassword(password)}/>
            <Button mode="contained" onPress={() => navigation.navigate(routerNames.userHome)}>Sign In</Button>
        </View>
    );
};