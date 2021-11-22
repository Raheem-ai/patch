import { StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import * as React from 'react';
import { labelNames, routerNames, SignInNavigationProp, styleVals } from '../types';
import { getStore } from '../stores/meta';
import { INotificationStore, IUserStore } from '../stores/interfaces';
import { navigateTo } from '../navigation';

type Props = {
    navigation: SignInNavigationProp;
};

export default function SignInForm( { navigation } : Props) {
    const [username, setTextUser] = React.useState('');
    const [password, setPassword] = React.useState('');

    const userStore = getStore<IUserStore>(IUserStore);

    const signIn = async () => {
        await userStore.signIn(username, password)

        setTimeout(() => {
            const notificationStore = getStore<INotificationStore>(INotificationStore);
            notificationStore.handlePermissions();
        }, 0);

        navigateTo(routerNames.userHomePage)
    }

    return(
        <View style={styles.container}>
            {/* <Text style={styles.title}>Sign In</Text> */}
            <TextInput mode="outlined" label={labelNames.username} value={username} onChangeText={username => setTextUser(username)}/>
            <TextInput mode="outlined" label={labelNames.password} value={password} onChangeText={password =>setPassword(password)}/>
            <Button mode="contained" onPress={signIn}>Sign In</Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // justifyContent: 'center',
        padding: 20,
        paddingTop: 20
    },
    title: {
        fontSize: styleVals.fontSizes.large,
        fontWeight: "bold",
        textAlign: 'center',
    },
});