// needed for uuid to work in react native env
import 'react-native-get-random-values';
// need for some decorator/observable tings
import "reflect-metadata"

import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, Modal, Alert, StatusBar, SafeAreaView, Dimensions } from 'react-native';
import { Button, configureFonts, DarkTheme, DefaultTheme, Provider as PaperProvider, TextInput } from 'react-native-paper';
import "react-native-gesture-handler";
import { Provider } from 'inversify-react';
import { getStore } from './src/stores/meta';

// // component imports
import SignInForm from './src/components/SignInForm';
import WelcomePage from './src/components/WelcomePage';
import SignUpForm from './src/components/SignUpForm';
import UserHomePage from './src/components/userside/UserHomePage';
import Header, { HeaderHeight } from './src/components/header/header';

import HelpRequestMap from './src/screens/helpRequestMap';
import HelpRequestList from './src/screens/helpRequestList';
import HelpRequestChat from './src/screens/helpRequestChat';
import HelpRequestDetails from './src/screens/helpRequestDetails';

// // navigating imports
import { NavigationContainer, NavigationState, Route, useNavigation, useRoute } from '@react-navigation/native';
import { createStackNavigator, StackHeaderProps } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { BottomDrawerHandleHeight, IBottomDrawerStore, ILocationStore, INotificationStore, IRequestStore, IUserStore } from './src/stores/interfaces';
import { navigateTo, navigationRef } from './src/navigation';
import { bindServices, initServices } from './src/services';
import { useEffect } from 'react';
import AppLoading from 'expo-app-loading';
import { bindStores, initStores } from './src/stores';
import { container } from './src/meta';
import GlobalBottomDrawer from './src/components/globalBottomDrawer';
import GlobalErrorBoundary from './src/globalErrorBoundary';
import { observer } from 'mobx-react';
import { runInAction } from 'mobx';
import TeamList from './src/screens/teamList';
import { ActiveRequestTabHeight } from './src/constants';
import { VisualArea } from './src/components/helpers/VisualArea';


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

    const notificationStore = getStore<INotificationStore>(INotificationStore);
    const locationStore = getStore<ILocationStore>(ILocationStore);

    // setup notifications for both foreground/background scenarios
    notificationStore.setup();

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

        setTimeout(() => {
          const userStore = getStore<IUserStore>(IUserStore);

          if (locationStore.hasForegroundPermission) {
            // not awaiting this but kicking it off here so any map views that 
            // need your current location get a head start on loading it
            locationStore.getCurrentLocation()
          }

          if (userStore.signedIn) {
            // not awaiting this on purpose as updating the push token might take a while
            notificationStore.handlePermissions()
          }
        }, 0);
      }
    })()

    return () => {
      notificationStore.teardown();
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
  const userStore = getStore<IUserStore>(IUserStore);

  const initialRoute = userStore.signedIn
      ? routerNames.userHomePage
      : routerNames.signIn

  return (
    // TODO: because we're using our own container with getStore() I don't think this provider is actually needed
    // unless we want an ergonomic way to switch out components in the future for ab testing ie. <Inject id='TestComponentId' />
    <Provider container={container}>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef} onStateChange={updateBottomDrawerRoute}>
          {/* <GlobalErrorBoundary> */}
            <StatusBar
              animated={true}
              barStyle={'light-content'}
              // just for android so it's behavior is *more* similiar to ios
              translucent={true} />
            <Stack.Navigator screenOptions={{ header, headerMode: 'float' }} initialRouteName={initialRoute}>
              <Stack.Screen name={routerNames.signIn} component={SignInForm} />
              <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
              <Stack.Screen name={routerNames.home} component={userScreen(WelcomePage)} />
              <Stack.Screen name={routerNames.userHomePage} component={userScreen(UserHomePage)} />
              <Stack.Screen name={routerNames.helpRequestDetails} component={userScreen(HelpRequestDetails)}/>
              <Stack.Screen name={routerNames.helpRequestMap} component={userScreen(HelpRequestMap)}/>
              <Stack.Screen name={routerNames.helpRequestList} component={userScreen(visualArea(HelpRequestList))}/>
              <Stack.Screen name={routerNames.helpRequestChat} component={userScreen(HelpRequestChat)}/>
              <Stack.Screen name={routerNames.teamList} component={userScreen(visualArea(TeamList))}/>
            </Stack.Navigator>
            <GlobalBottomDrawer/>
          {/* </GlobalErrorBoundary>   */}
        </NavigationContainer>
      </PaperProvider>
     </Provider>
  );
}

const userScreen = function(Component: (props) => JSX.Element) {
  return observer(function(props) {
    const userStore = getStore<IUserStore>(IUserStore);
    
    return userStore.signedIn
      ? <Component {...props} />
      : null
  })
}

const updateBottomDrawerRoute = function(state: NavigationState) {
  const routeName = state?.routes[state?.index]?.name;

  if (routeName) {
    runInAction(() => {
      const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
      bottomDrawerStore.currentRoute = routeName
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