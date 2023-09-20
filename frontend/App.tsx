// needed for uuid to work in react native env
import 'react-native-get-random-values';
// need for some decorator/observable tings
import "reflect-metadata"

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import "react-native-gesture-handler";
import { Provider } from 'inversify-react';

// // component imports
import LandingPage from './src/screens/landingPage';
import SignInForm from './src/screens/SignInForm';
import UpdatePassword from './src/screens/UpdatePassword';
import SendResetCode from './src/screens/SendResetCode';
import WelcomePage from './src/screens/WelcomePage';
import SignUpForm from './src/screens/SignUpForm';
import UserHomePage from './src/screens/UserHomePage';
import Header from './src/components/header/header';

import HelpRequestMap from './src/screens/helpRequestMap';
import HelpRequestList from './src/screens/helpRequestList';
import HelpRequestChat from './src/screens/helpRequestChat';
import HelpRequestDetails from './src/screens/helpRequestDetails';

// // navigating imports
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createStackNavigator, StackHeaderProps } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { appUpdateStore, linkingStore, navigationStore, notificationStore, organizationStore, userStore } from './src/stores/interfaces';
import { navigationRef } from './src/navigation';
import { bindServices, initServices } from './src/services';
import { useEffect } from 'react';
import { bindStores, initStores } from './src/stores';
import { container } from './src/meta';
import GlobalBottomDrawer from './src/components/bottomDrawer/globalBottomDrawer';
import { observer } from 'mobx-react';
import { runInAction } from 'mobx';
import TeamList from './src/screens/teamList';
import { VisualArea } from './src/components/helpers/visualArea';
import SignUpThroughOrg from './src/screens/signUpThroughOrg';
import UserDetails from './src/screens/userDetails';
import Alerts from './src/components/alerts/alerts';
import ComponentLibrary from './src/screens/componentLibrary';
import Settings from './src/screens/settings';
import JoinOrganizationForm from './src/screens/JoinOrganizationForm';
import InvitationSuccessfulPage from './src/screens/InvitationSuccessfulPage';
import CreateAccountForm from './src/screens/CreateAccountForm';
import Chats from './src/screens/chats';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import boot from './src/boot';
import * as Sentry from 'sentry-expo';
import { apiHost, sentryDSN, inProdApp, appEnv } from './src/config';
import HelpAndInfo from './src/screens/helpAndInfo';

const routingInstrumentation = new Sentry.Native.ReactNavigationInstrumentation();

// TODO: use Sentry.withProfiler with each top level screen
Sentry.init({
  dsn: sentryDSN,
  // *** Note: set this to 'true' if you need to test error reporting in the dev env ***
  enableInExpoDevelopment: false, 
  // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  debug: !inProdApp, 
  integrations: [
    new Sentry.Native.ReactNativeTracing({
      routingInstrumentation,
      tracingOrigins: [apiHost]
    }),
  ],
  tracesSampleRate: 1.0,
  environment: appEnv,
  // release: '' TODO: need to make sure this is pointing to the latest source maps for the latest update
});

const Stack = createStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#76599A',
    secondary: '#5D8A98',
  },
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function App() {
    const [isLoading, setIsLoading] = useState(true);
  
  // handle store binding + initialization + splash screen loading state
    useEffect(() => {

      return boot(() => {
        if (appUpdateStore().waitingForReload) {
          // don't leave splash screen while waiting for OS to reload app with update
          return 
        }

        setIsLoading(false);
        SplashScreen.hideAsync();
      })

    }, []);

    const header = (props: StackHeaderProps) => {
        return <Header {...props} />
    }

    const statusBar = () => {
        return (
          <StatusBar
            animated={true}
            style={'light'}
            // just for android so it's behavior is *more* similiar to ios
            translucent={true} />
        )
    }

    if (isLoading) {
        // not a real element but it configures the status bar while the 
        // splash screen is up
        return statusBar()
    }

    // safe to get here because isLoading doesn't get set until after store binding/init
    const initialRoute = linkingStore().initialRoute
        ? linkingStore().initialRoute
        : userStore().signedIn
            ? routerNames.userHomePage
            : routerNames.landing

    return (
      // TODO: because we're using our own container with getStore() I don't think this provider is actually needed
      // unless we want an ergonomic way to switch out components in the future for ab testing ie. <Inject id='TestComponentId' />
        <Provider sentry-label='Patch App' container={container}>
            <PaperProvider theme={theme}>
                <NavigationContainer 
                  ref={navigationRef} 
                  onStateChange={updateNavigationRoute}
                  onReady={instrumentNavigation}
                >
                {/* <GlobalErrorBoundary> */}
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    { statusBar() }
                    <Stack.Navigator screenOptions={{ header, headerMode: 'float', gestureEnabled: false }} initialRouteName={initialRoute}>
                        {/* <Stack.Screen name={routerNames.landing} component={LandingPage} /> */}
                        <Stack.Screen name={routerNames.landing} component={SignInForm} />
                        <Stack.Screen name={routerNames.signIn} component={SignInForm} />
                        <Stack.Screen name={routerNames.updatePassword} component={UpdatePassword} />
                        <Stack.Screen name={routerNames.sendResetCode} component={SendResetCode} />
                        <Stack.Screen name={routerNames.joinOrganization} component={JoinOrganizationForm} />
                        <Stack.Screen name={routerNames.invitationSuccessful} component={InvitationSuccessfulPage} />
                        <Stack.Screen name={routerNames.createAccount} component={CreateAccountForm} />
                        {/* TO DO: Deprecate SignUpForm, SignUpThroughOrg, and WelcomePage */}
                        <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
                        <Stack.Screen name={routerNames.signUpThroughOrg} component={SignUpThroughOrg} />
                        <Stack.Screen name={routerNames.home} component={userScreen(routerNames.home, WelcomePage)} />
                        <Stack.Screen name={routerNames.userHomePage} component={userScreen(routerNames.userHomePage, UserHomePage)} />
                        <Stack.Screen name={routerNames.helpRequestDetails} component={userScreen(routerNames.helpRequestDetails, HelpRequestDetails)}/>
                        <Stack.Screen name={routerNames.helpRequestMap} component={userScreen(routerNames.helpRequestMap, HelpRequestMap)}/>
                        <Stack.Screen name={routerNames.helpRequestList} component={userScreen(routerNames.helpRequestList, visualArea(HelpRequestList))}/>
                        <Stack.Screen name={routerNames.helpRequestChat} component={userScreen(routerNames.helpRequestChat, HelpRequestChat)}/>
                        <Stack.Screen name={routerNames.teamList} component={userScreen(routerNames.teamList, visualArea(TeamList))}/>
                        <Stack.Screen name={routerNames.componentLib} component={userScreen(routerNames.componentLib, visualArea(ComponentLibrary))}/>
                        <Stack.Screen name={routerNames.userDetails} component={userScreen(routerNames.userDetails, visualArea(UserDetails))}/>
                        <Stack.Screen name={routerNames.settings} component={userScreen(routerNames.settings, Settings)}/>
                        <Stack.Screen name={routerNames.helpAndInfo} component={userScreen(routerNames.helpAndInfo, HelpAndInfo)}/>
                        <Stack.Screen name={routerNames.chats} component={userScreen(routerNames.chats, visualArea(Chats))}/>
                    </Stack.Navigator>
                    <Alerts/>
                    <GlobalBottomDrawer/>
                {/* </GlobalErrorBoundary>   */}
                  </GestureHandlerRootView>
                </NavigationContainer>
            </PaperProvider>
        </Provider>
    );
}

export default Sentry.Native.wrap(App);

const userScreen = function(route: keyof RootStackParamList, Component: (props) => JSX.Element) {
  return observer(function(props) {    
    return userStore().signedIn && organizationStore().isReady
      ? <Component sentry-label={route} {...props} />
      : null
  })
}

const instrumentNavigation = function () {
  // Register the navigation container with the instrumentation
  routingInstrumentation.registerNavigationContainer(navigationRef);
}

const updateNavigationRoute = function(state: NavigationState) {
  const routeName = state?.routes[state?.index]?.name;

  if (routeName) {
    runInAction(() => {
        navigationStore().currentRoute = routeName as keyof RootStackParamList;
    })
  }
}

const visualArea = function(Component: (props) => JSX.Element) {
  return function(props) {
    return (
      <VisualArea>
        <Component {...props} />
      </VisualArea>
    )
  }
}

const styles = StyleSheet.create({
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    // alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 60,
    marginBottom: 20
  },
  input: {
    width: 200,
    height: 40
  }
})