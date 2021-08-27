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

type MyState = {
    visible: boolean,
    message: null | string,
    username: string,
    password: string,
};

class SignInForm extends React.Component<Props, MyState> {

    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            message: null,
            username: "",
            password: "",
        };
    }

    setTextUser = input => {
        this.setState({username: input});
    };

    setPassword = input => {
        this.setState({password: input});
    };

    showDialog = () => {
        this.setState({visible: true});
    };

    hideDialog = () => {
        this.setState({visible: false});
    };

    public userStore = getStore<IUserStore>(IUserStore);

    signIn = async () => {
        try {
            await this.userStore.signIn(this.state.username, this.state.password);
            this.props.navigation.navigate(routerNames.userHome);
        } catch(e) {
            this.setState({message: "Your username or password wsa incorrect."});
            this.showDialog();
        }
    };

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Sign In</Text>
                <TextInput mode="outlined" label={labelNames.username} value={this.state.username} onChangeText={username => this.setTextUser(username)} />
                <TextInput mode="outlined" label={labelNames.password} value={this.state.password} onChangeText={password => this.setPassword(password)} />
                <Button mode="contained" onPress={() => this.signIn()}>Sign In</Button>
                <PopUpMessage display={this.state.visible} error={this.state.message} hideDialog={this.hideDialog} />
            </View>
        );
    }
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

export default SignInForm;

// OLD IMPLEMENTATION: FUNCTIONAL COMPONENT
/*export default function SignInForm({ navigation }: Props) {
    let error = null;

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
            error = "Your username or password was incorrect.";
            showDialog();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sign In</Text>
            <TextInput mode="outlined" label={labelNames.username} value={username} onChangeText={username => setTextUser(username)} />
            <TextInput mode="outlined" label={labelNames.password} value={password} onChangeText={password => setPassword(password)} />
            <Button mode="contained" onPress={() => signIn()}>Sign In</Button>
            <PopUpMessage display={visible} error={error} hideDialog={hideDialog} />
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
});*/