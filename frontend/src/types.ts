import { StackNavigationProp, StackScreenProps } from "@react-navigation/stack";
import { LinkExperience, LinkParams, PatchEventPacket, PatchEventType, RequestTeamEventTypes, RequestDetailsTabs } from "../../common/models";

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
    HelpRequestDetails: NotificationRouteParams<RequestTeamEventTypes, { initialTab?: RequestDetailsTabs }>;
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
    chats: "Channels"
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
        beta: '#F9F6FA',
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
        standard: '#FFF',
        settings: '#F0EDF0',
        secondary: '#F6F4F6',
        signIn: '#F0EDF0',
        dark: '#111',
        medium: '#ddd',
        filter: '#F0F0F0',
        filterSelectedItem: '#999',
        menu: '#111',
        tabs: '#111',
        tags: {
            primaryForeground: '#FFF',
            primaryBackground: '#111',
            secondaryForeground: '#F0F0F0',
            secondaryBackground: '#444',
            tertiaryForeground: '#666',
            tertiaryBackground: '#E0E0E0',
        },
    },
    uiControls: {
        foregroundReversed: '#FFF',
        backgroundReversed: '#666',
        foregroundDisabledReversed: '#999',
        backgroundDisabledReversed: '#333',
    },
    text: {
        default: '#111',
        secondary: '#333',
        tertiary: '#999',
        disabled: '#999',
        defaultReversed: '#f6f6f6',
        secondaryReversed: '#aaa',
        tertiaryReversed: '#999',
        disabledReversed: '#999',
        forms: {
            sectionHeader: '#999',
            fieldLabel: '#333',
            fieldDescription: '#999',
            placeholder: '#999'
        },
        buttonLabelPrimary: '#FFF',
        buttonLabelSecondary: 'rgba(118, 89, 154, 0.66)',
        signInTitle: '#76599A',
        landingCaption: '#FFFFFF80',
        landingLinks: '#F7F3FB',
        good: '#55BB76',
        okay: '#ebae13',
        bad: '#E55300',
    },
    icons: {
        superlight: '#E0E0E0',
        light: '#999',
        lighter: '#bbb',
        dark: '#666',
        superdark: '#333',
        lightReversed: '#f0f0f0',
        darkReversed: '#999',
    },
    borders: {
        formFields: '#E0E0E0',
        filter: '#E0E0E0',
        list: '#eee',
        menu: '#666',
    },
    good: '#55BB76',
    okay: '#F5C037',
    bad: '#E55300',
    neutral: '#CCCCCC',
    nocolor: 'rgba(255, 255, 255, 0)'
}

enum BASIC_ICONS {
    minus = 'minus',
    plus = 'plus',
    check = 'check',
    checkCircle = 'check-circle',
    chevronRight = 'chevron-right',
    chevronLeft = 'chevron-left',
    chevronUp = 'chevron-up',
    chevronDown = 'chevron-down',
    xMark = 'close',
    chatBubble = 'message',
    chatBubbleBadge = 'message-badge',
    chatBubbleText = 'message-text',
    clockOutline = 'clock-outline',
    phone = 'phone',
    email = 'email',
}

export const ICONS = {
    menu: 'menu',
    accountMultiple: 'account-multiple',
    tag: 'tag',
    filterClose: BASIC_ICONS.chevronUp,
    filterOpen: BASIC_ICONS.chevronDown,
    add: 'plus',
    edit: 'pencil',
    role: 'clipboard-account',
    clock: 'clock-outline',
    removeUser: 'close',
    deleteItem: 'close',
    deleteCategory: 'delete',
    responder: 'account',
    responders: 'group',
    unselectedSmall: 'check-circle-outline',
    selectedSmall: 'check-circle',
    check: BASIC_ICONS.check,
    attachment: 'paperclip',
    sendMessage: 'send',
    removeCategorizedItem: BASIC_ICONS.minus,
    openListItem: BASIC_ICONS.chevronRight,
    selectListItem: BASIC_ICONS.check,
    navCancel: BASIC_ICONS.xMark,
    navBack: BASIC_ICONS.chevronLeft,
    showPassword: 'eye',
    hidePassword: 'eye-off',
    textInputClear: BASIC_ICONS.xMark,
    refresh: 'refresh',
    mapMarker: 'map-marker',
    map: 'map',
    cardList: 'view-agenda',
    newMessage: BASIC_ICONS.chatBubble,
    timeRequestCreated: 'phone-in-talk',
    timeCallStarted: 'phone-in-talk',
    callerContactInfo: 'card-account-phone',
    joinDecline: BASIC_ICONS.xMark,
    joinAccept: BASIC_ICONS.check,
    joinAccepted: BASIC_ICONS.checkCircle,
    returnToActiveRequest: 'keyboard-return',
    organization: 'domain',
    addPhoto: 'camera-plus',
    callPhone: BASIC_ICONS.phone,
    sendEmail: BASIC_ICONS.email,
    request: 'human-greeting-variant',
    permissions: 'key',
    schedule: 'calendar',
    channels: 'forum',
    userStatusOnRequestOnDuty: 'lightning-bolt-circle',
    userStatusOnRequestOffDuty: 'lightning-bolt',
    userStatusOnDuty: 'circle',
    userStatusOffDuty: 'circle-outline',
    statusUnassignedOrReady: 'account-multiple',
    statusOnTheWay: 'arrow-right',
    statusOnSite: 'map-marker',
    statusFinished: 'check', 
    statusClosed: 'lock',
    priority1: 'chevron-up',
    priority2: 'chevron-double-up',
    priority3: 'chevron-triple-up',
}