// needed for uuid to work in react native env
import 'react-native-get-random-values';
// need for some decorator/observable tings
import "reflect-metadata"

import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, Modal, Alert, StatusBar, SafeAreaView, Dimensions } from 'react-native';
import { Button, configureFonts, DarkTheme, DefaultTheme, Provider as PaperProvider, TextInput } from 'react-native-paper';
import "react-native-gesture-handler";
import { Provider } from 'inversify-react';

// // component imports
import LandingPage from './src/screens/landingPage';
import SignInForm from './src/screens/SignInForm';
import WelcomePage from './src/screens/WelcomePage';
import SignUpForm from './src/screens/SignUpForm';
import UserHomePage from './src/screens/UserHomePage';
import Header, { HeaderHeight } from './src/components/header/header';

import HelpRequestMap from './src/screens/helpRequestMap';
import HelpRequestList from './src/screens/helpRequestList';
import HelpRequestChat from './src/screens/helpRequestChat';
import HelpRequestDetails from './src/screens/helpRequestDetails';

// // navigating imports
import { NavigationContainer, NavigationState, Route, useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator, StackHeaderProps } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { BottomDrawerHandleHeight, bottomDrawerStore, IBottomDrawerStore, ILinkingStore, ILocationStore, INotificationStore, IRequestStore, IUserStore, linkingStore, navigationStore, notificationStore, organizationStore, userStore } from './src/stores/interfaces';
import { navigateTo, navigationRef } from './src/navigation';
import { bindServices, initServices } from './src/services';
import { useEffect } from 'react';
import AppLoading from 'expo-app-loading';
import { bindStores, initStores } from './src/stores';
import { container } from './src/meta';
import GlobalBottomDrawer from './src/components/bottomDrawer/globalBottomDrawer';
import GlobalErrorBoundary from './src/globalErrorBoundary';
import { observer } from 'mobx-react';
import { runInAction } from 'mobx';
import TeamList from './src/screens/teamList';
import { ActiveRequestTabHeight } from './src/constants';
import { VisualArea } from './src/components/helpers/visualArea';
import SignUpThroughOrg from './src/screens/signUpThroughOrg';
import UserDetails from './src/screens/userDetails';
import Alerts from './src/components/alerts/alerts';
import ComponentLibrary from './src/screens/componentLibrary';
import Settings from './src/screens/settings';


const Stack = createStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3498db',
    accent: '#f1c40f',
  },
};

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
  
  // handle store binding + initialization + splash screen loading state
    useEffect(() => {
        bindStores();
        bindServices();

        // setup notifications for both foreground/background scenarios
        notificationStore().setup();

        (async () => {
            try {
                await Promise.all([
                    initStores(),
                    initServices()
                ]);
            } catch (e) {
                console.error('Error during initialization:', e)
            } finally {
                setIsLoading(false);
            }
        })()

        return () => {
            notificationStore().teardown();
        }

    }, []);

    const header = (props: StackHeaderProps) => {
        return <Header {...props} />
    }

    if (isLoading) {
        return (
            <AppLoading/>
        )
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
        <Provider container={container}>
            <PaperProvider theme={theme}>
                <NavigationContainer ref={navigationRef} onStateChange={updateNavigationRoute}>
                {/* <GlobalErrorBoundary> */}
                    <StatusBar
                        animated={true}
                        barStyle={'light-content'}
                        // just for android so it's behavior is *more* similiar to ios
                        translucent={true} />
                    <Stack.Navigator screenOptions={{ header, headerMode: 'float' }} initialRouteName={initialRoute}>
                        <Stack.Screen name={routerNames.landing} component={LandingPage} />
                        <Stack.Screen name={routerNames.signIn} component={SignInForm} />
                        <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
                        <Stack.Screen name={routerNames.signUpThroughOrg} component={SignUpThroughOrg} />
                        <Stack.Screen name={routerNames.home} component={userScreen(WelcomePage)} />
                        <Stack.Screen name={routerNames.userHomePage} component={userScreen(UserHomePage)} />
                        <Stack.Screen name={routerNames.helpRequestDetails} component={userScreen(HelpRequestDetails)}/>
                        <Stack.Screen name={routerNames.helpRequestMap} component={userScreen(HelpRequestMap)}/>
                        <Stack.Screen name={routerNames.helpRequestList} component={userScreen(visualArea(HelpRequestList))}/>
                        <Stack.Screen name={routerNames.helpRequestChat} component={userScreen(HelpRequestChat)}/>
                        <Stack.Screen name={routerNames.teamList} component={userScreen(visualArea(TeamList))}/>
                        <Stack.Screen name={routerNames.componentLib} component={userScreen(visualArea(ComponentLibrary))}/>
                        <Stack.Screen name={routerNames.userDetails} component={userScreen(visualArea(UserDetails))}/>
                        <Stack.Screen name={routerNames.settings} component={userScreen(Settings)}/>
                    </Stack.Navigator>
                    <Alerts/>
                    <GlobalBottomDrawer/>
                {/* </GlobalErrorBoundary>   */}
                </NavigationContainer>
            </PaperProvider>
        </Provider>
    );
}

const userScreen = function(Component: (props) => JSX.Element) {
  return observer(function(props) {    
    return userStore().signedIn && organizationStore().isReady
      ? <Component {...props} />
      : null
  })
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