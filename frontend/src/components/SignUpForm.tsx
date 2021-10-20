import { StyleSheet, Text, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { labelNames, RootStackParamList, routerNames, ScreenProps, styleVals } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { getStore } from '../stores/meta';
import { IUserStore } from '../stores/interfaces';
import { navigateTo } from '../navigation';

type Props = ScreenProps<'SignUp'>;

export default function SignUpForm({ navigation }: Props) {
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');

    const userStore = getStore<IUserStore>(IUserStore);

    const signup = async () => {
        await userStore.signUp(email, password);
        navigateTo(routerNames.userHomePage);
    }

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Create your account</Text>
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.firstname} value={firstName} onChangeText={firstName => setFirstName(firstName)}/>
            <TextInput style={styles.spacing} mode="outlined"label={labelNames.lastname} value={lastName} onChangeText={lastName => setLastName(lastName)}/>
            <TextInput style={styles.spacing} mode="outlined"label={labelNames.email} value={email} onChangeText={email => setEmail(email)}/>
            <TextInput style={styles.spacing} mode="outlined"label={labelNames.username} value={username} onChangeText={username =>setUsername(username)} />
            <TextInput style={styles.spacing} mode="outlined"label={labelNames.password} value={password} onChangeText={password => setPassword(password)}/>
            <Button style={styles.spacing} mode="contained" onPress={() => navigateTo(routerNames.userHomePage)}>Create Account</Button>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: styleVals.fontSizes.large,
        fontWeight: "bold",
        textAlign: 'center',
    },
    spacing: {
        paddingHorizontal: styleVals.paddingVals.medium,
        paddingBottom: styleVals.paddingVals.large,
    },
});