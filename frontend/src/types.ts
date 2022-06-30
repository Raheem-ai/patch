import { StackNavigationProp, StackScreenProps } from "@react-navigation/stack";
import { LinkExperience, LinkParams, PatchEventPacket, PatchEventType, RequestTeamEventTypes } from "../../common/models";

export type NotificationRouteParams<T extends PatchEventType, P = {}> = {
    // notification?: PatchEventTypes<T>
    notification?: PatchEventPacket<T>
} & P;

// TODO: update these types as well
export type RootStackParamList = {
    Landing: undefined;
    JoinOrganization: undefined;
    InvitationSuccessful: undefined;
    CreateAccount: undefined;
    SignIn: undefined;
    // TODO: Deprecate Home, SignUp, SignUpThroughOrg?
    Home: undefined;
    SignUp: undefined;
    UserHomePage: undefined;
    HelpRequestDetails: NotificationRouteParams<RequestTeamEventTypes>;
    HelpRequestMap: undefined;
    HelpRequestList: undefined;
    HelpRequestChat: undefined;
    UserDetails: undefined;
    TeamList: undefined;
    ComponentLib: undefined;
    Settings: undefined;
    Chats: undefined;
    SignUpThroughOrg: LinkParams[LinkExperience.SignUpThroughOrganization]
};

// lets us have strict types for routerNames so we can get intellisense for them
type TypedRouterNames = {
    [Key in keyof RootStackParamList as Uncapitalize<Key> ]: Key
}

export const routerNames: TypedRouterNames = {
    landing: "Landing",
    joinOrganization: "JoinOrganization",
    invitationSuccessful: "InvitationSuccessful",
    signIn: "SignIn",
    createAccount: "CreateAccount",
    home: "Home",
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
    settings: "Settings",
    chats: "Chats"
};

export type ScreenProps<T extends keyof RootStackParamList> = StackScreenProps<RootStackParamList, T>

export type LandingPageNavigationProp = StackNavigationProp<RootStackParamList, 'Landing'>;
export type JoinOrganizationNavigationProp = StackNavigationProp<RootStackParamList, 'JoinOrganization'>;
export type InvitationSuccessfulProp = StackNavigationProp<RootStackParamList, 'InvitationSuccessful'>;
export type CreateAccountNavigationProp = StackNavigationProp<RootStackParamList, 'CreateAccount'>;

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
    invitationCode: 'Invitation code'
};

export const Colors = {
    primary: {
        alpha: '#76599A',
        // beta: '#F9F6FA',
        delta: '#E6E1E8'
    },
    secondary: {
        alpha: '#5D8A98', 
        beta: '#CFDCE0',
        // delta: '#A5BAC2'
    },
    tertiary: {
        alpha: '#D04B00'
    },
    backgrounds: {
        splash: '#53317C',
        standard: '#FFFFFF',
        settings: '#FAF9FA'
    },
    text: {
        buttonLabelPrimary: '#FFFFFF',
        buttonLabelSecondary: 'rgba(118, 89, 154, 0.66)',
        settingsTitle: '#76599A'
    },
    good: '#55BB76',
    okay: '#EBAA02',
    bad: '#D03200'
}