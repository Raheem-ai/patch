import { StackNavigationProp, StackScreenProps } from "@react-navigation/stack";
import { HelpRequest, LinkExperience, LinkParams, NotificationPayload, NotificationType } from "../../common/models";

export type NotificationRouteParams<T extends NotificationType, P = {}> = {
    notification?: NotificationTypes<T>
} & P;

type NotificationTypes<T extends NotificationType> = T extends any 
    ? { type: T, payload: NotificationPayload<T> } 
    : never;

export type RootStackParamList = {
    Home: undefined;
    SignIn: undefined;
    SignUp: undefined;
    UserHomePage: undefined;
    HelpRequestDetails: NotificationRouteParams<NotificationType.AssignedIncident | NotificationType.BroadCastedIncident>;
    HelpRequestMap: undefined;
    HelpRequestList: undefined;
    HelpRequestChat: undefined;
    UserDetails: undefined;
    TeamList: undefined;
    ComponentLib: undefined;
    Settings: undefined;
    SignUpThroughOrg: LinkParams[LinkExperience.SignUpThroughOrganization]
};

// lets us have strict types for routerNames so we can get intellisense for them
type TypedRouterNames = {
    [Key in keyof RootStackParamList as Uncapitalize<Key> ]: Key
}

export const routerNames: TypedRouterNames = {
    home: "Home",
    signIn: "SignIn",
    signUp: "SignUp",
    signUpThroughOrg: "SignUpThroughOrg",
    userHomePage: "UserHomePage",
    userDetails: "UserDetails",
    helpRequestDetails : "HelpRequestDetails",
    helpRequestMap: "HelpRequestMap",
    helpRequestList: "HelpRequestList",
    helpRequestChat: "HelpRequestChat",
    componentLib: "ComponentLib",
    teamList: "TeamList",
    settings: "Settings"
};

export type ScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>

export type SignInNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;
export type SignUpNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
export type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

// TODO: fully flush out using resource strings so we can translate :)
export const labelNames = {
    username: 'Username',
    password: 'Password',
    firstname: 'First Name',
    lastname: 'Last Name',
    email: 'Email',
};

export const Colors = {
    primary: {
        alpha: '#694F70',
        beta: '#F9F6FA',
        delta: '#E6E1E8'
    },
    secondary: {
        alpha: '#5D8A98', 
        beta: '#CFDCE0',
        delta: '#A5BAC2'
    },
    tertiary: {
        alpha: '#D04B00'
    }
}