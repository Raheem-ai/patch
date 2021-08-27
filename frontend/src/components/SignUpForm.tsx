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
import { stringifyKey } from 'mobx/dist/internal';

type Props = {
    navigation: UserHomeNavigationProp;
};

type MyState = {
    visible: boolean,
    message: null | string,
    firstName: string,
    lastName: string,
    email: string,
    username: string,
    password: string,
};

class SignUpForm extends React.Component<Props, MyState> {

    contructor() {
        this.state = {
            visible: false,
            message: null,
            firstName: "",
            lastName: "",
            email: "",
            username: "",
            password: "",
        };
    }

    setFirstName = input => { this.setState({ firstName: input }) };
    setLastName = input => { this.setState({ lastName: input }) };
    setEmail = input => { this.setState({ email: input }) };
    setUsername = input => { this.setState({ username: input }) };
    setPassword = input => { this.setState({ password: input }) };
    showDialog = () => { this.setState({ visible: true }) };
    hideDialog = () => { this.setState({ visible: false }) };

    validate = () => {
        let validEmail = new RegExp('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$');

        if (this.state.firstName === '' || this.state.lastName === '' || this.state.email === '' || this.state.username === '' || this.state.password === '') {
            this.setState({ message: "You are missing required information." });
            return false;
        } else if (!validEmail.test(this.state.email)) {
            this.setState({ message: "You entered an invalid email." });
            return false;
        }
        return true;
    };

    public userStore = getStore<IUserStore>(IUserStore);

    signup = async () => {
        let valid = this.validate();

        if (valid) {
            try {
                await this.userStore.signUp(this.state.email, this.state.password);
                this.props.navigation.navigate(routerNames.userHome);
            } catch (e) {
                this.setState({ message: "There was an error processing your sign up attempt. Please try again." });
                this.showDialog();
            }
        } else {
            this.showDialog();
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Create your account</Text>
                <TextInput style={styles.spacing} mode="outlined" label={labelNames.firstname} value={this.state.firstName} onChangeText={firstName => this.setFirstName(firstName)} />
                <TextInput style={styles.spacing} mode="outlined" label={labelNames.lastname} value={this.state.lastName} onChangeText={lastName => this.setLastName(lastName)} />
                <TextInput style={styles.spacing} mode="outlined" label={labelNames.email} value={this.state.email} onChangeText={email => this.setEmail(email)} />
                <TextInput style={styles.spacing} mode="outlined" label={labelNames.username} value={this.state.username} onChangeText={username => this.setUsername(username)} />
                <TextInput style={styles.spacing} mode="outlined" label={labelNames.password} value={this.state.password} onChangeText={password => this.setPassword(password)} />
                <Button style={styles.spacing} mode="contained" onPress={() => this.signup()}>Create Account</Button>
                <PopUpMessage display={this.state.visible} error={this.state.message} hideDialog={this.hideDialog} />
            </View>
        );
    };
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

export default SignUpForm;

// OLD IMPLEMENTATION: FUNCTIONAL COMPONENT
/*
export default function SignUpForm({ navigation }: Props) {
    let error = null;

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
            error = "You are missing required information.";
            return false;
        } else if (!validEmail.test(email)) {
            error = "You entered an invalid email.";
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
                error = "There was an error processing your sign up attempt. Please try again.";
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
            <PopUpMessage display={visible} error={error} hideDialog={hideDialog} />
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
});*/