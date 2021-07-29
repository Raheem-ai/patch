import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { labelNames, RootStackParamList, routerNames, UserHomeNavigationProp } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { getStore } from '../di';
import { IUserStore } from '../interfaces';

type Props = {
    navigation: UserHomeNavigationProp;
};

export default function SignUpForm({ navigation }: Props) {
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');

    const userStore = getStore<IUserStore>(IUserStore);

    const signup = async () => {
        await userStore.signUp(email, password);
        navigation.navigate(routerNames.userHome);
    }

    return(
        <View>
            <TextInput label={labelNames.firstname} value={firstName} onChangeText={firstName => setFirstName(firstName)}/>
            <TextInput label={labelNames.lastname} value={lastName} onChangeText={lastName => setLastName(lastName)}/>
            <TextInput label={labelNames.email} value={email} onChangeText={email => setEmail(email)}/>
            <TextInput label={labelNames.username} value={username} onChangeText={username =>setUsername(username)} />
            <TextInput label={labelNames.firstname} value={password} onChangeText={password => setPassword(password)}/>
            <Button mode="contained" onPress={signup}>Create Account</Button>
        </View>
    );
};