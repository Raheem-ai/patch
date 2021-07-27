import { StackNavigationProp } from "@react-navigation/stack";

export type RootStackParamList = {
    Home: undefined;
    SignIn: undefined;
    SignUp: undefined;
    UserHomePage: undefined;
};

export const routerNames = {
    home: "Home",
    signIn: "SignIn",
    signUp: "SignUp",
    userHome: "UserHomePage",
};

export type SignInNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;