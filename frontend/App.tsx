// needed for uuid to work in react native env
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
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

// navigating imports
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { IDispatchStore, ILocationStore, INotificationStore, IUserStore } from './src/stores/interfaces';
import UserStore from './src/stores/userStore';
import LocationStore from './src/stores/locationStore';
import NotificationStore from './src/stores/notificationStore';
import DispatchStore from './src/stores/dispatchStore';
import { navigationRef } from './src/navigation';
import { useEffect } from 'react';
import IncidentDetails from './src/screens/incidentDetails';
import { getApiHost, updateApiHost } from './src/api';
import AppLoading from 'expo-app-loading';
import { bindStores, initStores } from './src/stores';



const Stack = createStackNavigator<RootStackParamList>();
  


/*const theme = {
  ...DarkTheme,
  roundness: 20,
  colors: {
    ...DarkTheme.colors,
    primary: '#2d3436',
    accent: '#1C1C1C',
    background: '#1c1c1c',
    backdrop: '1c1c1c',
  },
};*/

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

  const [apiHost, setApiHost] = useState(getApiHost())
  const [isApiHostSet, setIsApiHostSet] = useState(!!apiHost)
  const [isLoading, setIsLoading] = useState(true);

  // setup notifications for both foreground/background scenarios
  useEffect(() => {
    const notificationStore = getStore<INotificationStore>(INotificationStore);
    notificationStore.setup();

    return () => {
      notificationStore.teardown();
    }
  }, [])

  // handle persistent store loading
  useEffect(() => {
    (async () => {
      await initStores();
      setIsLoading(false);

      setTimeout(() => {
        const userStore = getStore<IUserStore>(IUserStore);
        const notificationStore = getStore<INotificationStore>(INotificationStore);

        if (userStore.signedIn) {
          // not awaiting this on purpose as updating the push token might take a while
          notificationStore.handlePermissions()
          navigationRef.current.navigate(routerNames.userHomePage)
        }
      }, 0);
    })()

  }, [])

  if (isLoading) {
    return (
      <AppLoading/>
    )
  }

  return (
    // TODO: because we're using our own container with getStore() I don't think this provider is actually needed
    // unless we want an ergonomic way to switch out components in the future
    <Provider container={container}>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator>
            <Stack.Screen name={routerNames.home} component={WelcomePage} />
            <Stack.Screen name={routerNames.signIn} component={SignInForm} />
            <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
            <Stack.Screen name={routerNames.userHomePage} component={UserHomePage} />
            <Stack.Screen name={routerNames.incidentDetails} component={IncidentDetails}/>
          </Stack.Navigator>
        </NavigationContainer>
        <Modal
          animationType="slide"
          transparent={true}
          visible={!isApiHostSet}
          onRequestClose={() => {
            Alert.alert('Modal has been closed.');
          }}>
            <View style={styles.modalView}> 
              <TextInput  style={styles.input} mode="outlined" label={'apiHost'} value={apiHost} onChangeText={h => setApiHost(h)}/>
              <Button mode="contained" onPress={() => {
                updateApiHost(apiHost);
                setIsApiHostSet(true);
                }}>Sign In</Button>
            </View>
          </Modal>
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