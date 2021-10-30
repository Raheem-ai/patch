// needed for uuid to work in react native env
import 'react-native-get-random-values';
// need for some decorator/observable tings
import "reflect-metadata"

import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Alert } from 'react-native';
import { Button, configureFonts, DarkTheme, DefaultTheme, Provider as PaperProvider, TextInput } from 'react-native-paper';
import { Switch, Route, BrowserRouter as Router, useHistory } from 'react-router-dom';
import "react-native-gesture-handler";
import { Provider } from 'inversify-react';
import container, { getStore } from './src/stores/meta';

// component imports
import SignInForm from './src/components/SignInForm';
import WelcomePage from './src/components/WelcomePage';
import SignUpForm from './src/components/SignUpForm';
import UserHomePage from './src/components/userside/UserHomePage';
import Header from './src/components/header/header';

import CreateHelpRequest from './src/screens/createHelpRequest';
import HelpRequestMap from './src/screens/helpRequestMap';
import HelpRequestList from './src/screens/helpRequestList';
import HelpRequestChat from './src/screens/helpRequestChat';
import HelpRequestDetails from './src/screens/helpRequestDetails';

// navigating imports
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackHeaderProps } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { ILocationStore, INotificationStore, IUserStore } from './src/stores/interfaces';
import { navigateTo, navigationRef } from './src/navigation';
import { initServices } from './src/services';
import { useEffect } from 'react';
// import { getApiHost, updateApiHost } from './src/api';
import AppLoading from 'expo-app-loading';
import { initStores } from './src/stores';


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
  const notificationStore = getStore<INotificationStore>(INotificationStore);
  const locationStore = getStore<ILocationStore>(ILocationStore);

  // const [apiHost, setApiHost] = useState(getApiHost())
  // const [isApiHostSet, setIsApiHostSet] = useState(!!apiHost)
  const [isLoading, setIsLoading] = useState(true);

  // setup notifications for both foreground/background scenarios
  useEffect(() => {
    notificationStore.setup();

    return () => {
      notificationStore.teardown();
    }
  }, [])

  // handle persistent store loading
  useEffect(() => {
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
            navigateTo(routerNames.userHomePage)
          } else {
            navigateTo(routerNames.signIn)
          }
        }, 0);
      }
    })()

  }, []);

  const header = (props: StackHeaderProps) => {
    return <Header {...props} />
  }

  if (isLoading) {
    return (
      <AppLoading/>
    )
  }

  return (
    // TODO: because we're using our own container with getStore() I don't think this provider is actually needed
    // unless we want an ergonomic way to switch out components in the future for ab testing ie. <Inject id='TestComponentId' />
    <Provider container={container}>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ header }} headerMode='screen'>
            <Stack.Screen name={routerNames.home} component={WelcomePage} />
            <Stack.Screen name={routerNames.signIn} component={SignInForm} />
            <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
            <Stack.Screen name={routerNames.userHomePage} component={UserHomePage} />
            <Stack.Screen name={routerNames.helpRequestDetails} component={HelpRequestDetails}/>
            <Stack.Screen name={routerNames.createHelpRequest} component={CreateHelpRequest}/>
            <Stack.Screen name={routerNames.helpRequestMap} component={HelpRequestMap}/>
            <Stack.Screen name={routerNames.helpRequestList} component={HelpRequestList}/>
            <Stack.Screen name={routerNames.helpRequestChat} component={HelpRequestChat}/>
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
     </Provider>
  );
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