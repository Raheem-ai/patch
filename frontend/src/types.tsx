import { StackNavigationProp, StackScreenProps } from "@react-navigation/stack";
import { NotificationPayload, NotificationType } from "../../common/models";

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
    IncidentDetails: NotificationRouteParams<NotificationType.AssignedIncident | NotificationType.BroadCastedIncident>
};

// lets us have strict types for routerNames so we can get intellisense for them
type TypedRouterNames = {
    [Key in keyof RootStackParamList as Uncapitalize<Key> ]: Key
}

export const routerNames: TypedRouterNames = {
    home: "Home",
    signIn: "SignIn",
    signUp: "SignUp",
    userHomePage: "UserHomePage",
    incidentDetails : "IncidentDetails"
};

export type NotificationScreenProp<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>
export type ScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>

export type SignInNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;
export type SignUpNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
export type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

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