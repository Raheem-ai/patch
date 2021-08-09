import { StackNavigationProp } from "@react-navigation/stack";

export type RootStackParamList = {
    Home: undefined;
    SignIn: undefined;
    SignUp: undefined;
    UserHomePage: undefined;
};

export const routerNames: {[index: string]: keyof RootStackParamList} = {
    home: "Home",
    signIn: "SignIn",
    signUp: "SignUp",
    userHome: "UserHomePage",
};

export type SignInNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;
export type SignUpNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
export type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
export type UserHomeNavigationProp = StackNavigationProp<RootStackParamList, 'UserHomePage'>;

export const labelNames = {
    username: 'Username',
    password: 'Password',
    firstname: 'First Name',
    lastname: 'Last Name',
    email: 'Email',
};

// style constants
export const styleVals = {
    fontSizes: {
        large: 25,
    },
    fontWeights: {
        heavy: "bold",
        regular: "normal",
    },
    paddingVals: {
        large: 15,
        medium: 10,
    },
};