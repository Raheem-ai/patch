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