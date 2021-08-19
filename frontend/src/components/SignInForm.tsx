import { StyleSheet, Text, View } from 'react-native';
import { Button, Dialog, HelperText, Paragraph, Portal, TextInput, Title } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { NavigationStackProp } from 'react-navigation-stack';
import { labelNames, routerNames, SignInNavigationProp, styleVals } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import API from '../api';
import { getStore } from '../di';
import { IUserStore } from '../interfaces';
import PopUpMessage from './PopUpMessage';
import { render } from 'enzyme';

type Props = {
    navigation: SignInNavigationProp;
};

export default function SignInForm({ navigation }: Props) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    const userStore = getStore<IUserStore>(IUserStore);

    const [visible, setVisible] = React.useState(false);

    const showDialog = () => setVisible(true);

    const hideDialog = () => setVisible(false);

    const signIn = async () => {
        try {
            await userStore.signIn(username, password);
            navigation.navigate(routerNames.userHome);
        } catch(e) {
            showDialog();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign In</Text>
            <TextInput mode="outlined" label={labelNames.username} value={username} onChangeText={username => setTextUser(username)} />
            <TextInput mode="outlined" label={labelNames.password} value={password} onChangeText={password => setPassword(password)} />
            <Button mode="contained" onPress={() => signIn()}>Sign In</Button>
            <PopUpMessage display={visible} error={"hey bro hey"} hideDialog={hideDialog} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: styleVals.paddingVals.medium,
    },
    title: {
        fontSize: styleVals.fontSizes.large,
        fontWeight: "bold",
        textAlign: 'center',
    },
});