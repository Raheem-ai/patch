import { StyleSheet, Text, View } from 'react-native';
import { Button, Dialog, HelperText, Paragraph, Portal, TextInput } from 'react-native-paper';
import * as React from 'react';
import { Header } from 'react-native/Libraries/NewAppScreen';
import { labelNames, RootStackParamList, routerNames, styleVals, UserHomeNavigationProp } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { getStore } from '../di';
import { IUserStore } from '../interfaces';
import { render } from 'enzyme';
import PopUpMessage from './PopUpMessage';
import Container from './Container';

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

    const [visible, setVisible] = React.useState(false);

    const showDialog = () => setVisible(true);

    const hideDialog = () => setVisible(false);

    // this is to make sure they entered valid information
    const validate = () => {
        let validEmail = new RegExp('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$');

        if (firstName === '' || lastName === '' || email === '' || username === '' || password === '') {
            return false;
        } else if (!validEmail.test(email)) {
            return false;
        }
        return true;
    };

    const signup = async () => {
        let valid = validate();

        if (valid) {
            try {
                await userStore.signUp(email, password);
                navigation.navigate(routerNames.userHome);
            } catch (e) {
                showDialog();
            }
        } else {
            showDialog();
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create your account</Text>
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.firstname} value={firstName} onChangeText={firstName => setFirstName(firstName)} />
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.lastname} value={lastName} onChangeText={lastName => setLastName(lastName)} />
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.email} value={email} onChangeText={email => setEmail(email)} />
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.username} value={username} onChangeText={username => setUsername(username)} />
            <TextInput style={styles.spacing} mode="outlined" label={labelNames.password} value={password} onChangeText={password => setPassword(password)} />
            <Button style={styles.spacing} mode="contained" onPress={() => signup()}>Create Account</Button>
            <PopUpMessage display={visible} error={"hey bro hey"} hideDialog={hideDialog} />
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