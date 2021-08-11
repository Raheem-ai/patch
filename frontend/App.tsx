// needed for uuid to work in react native env
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, configureFonts, DarkTheme, DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { Switch, Route, BrowserRouter as Router, useHistory } from 'react-router-dom';
import "react-native-gesture-handler";
import { Provider } from 'inversify-react';
import container from './src/di';

// component imports
import SignInForm from './src/components/SignInForm';
import WelcomePage from './src/components/WelcomePage';
import SignUpForm from './src/components/SignUpForm';
import UserHomePage from './src/components/userside/UserHomePage';

// navigating imports
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';
import { IDispatchStore, ILocationStore, INotificationStore, IUserStore } from './src/interfaces';
import UserStore from './src/stores/userStore';
import LocationStore from './src/stores/locationStore';
import NotificationStore from './src/stores/notificationStore';
import DispatchStore from './src/stores/dispatchStore';



const Stack = createStackNavigator<RootStackParamList>();
  
container.bind(IUserStore.id).to(UserStore);
container.bind(ILocationStore.id).to(LocationStore);
container.bind(INotificationStore.id).to(NotificationStore);
container.bind(IDispatchStore.id).to(DispatchStore);

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
  return (
    // TODO: because we're using our own container with getStore() I don't think this provider is actually needed
    // unless we want an ergonomic way to switch out components in the future
    <Provider container={container}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={routerNames.home} component={WelcomePage} />
            <Stack.Screen name={routerNames.signIn} component={SignInForm} />
            <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
            <Stack.Screen name={routerNames.userHome} component={UserHomePage} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
     </Provider>
  );
}
