import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Switch, Route, BrowserRouter as Router, useHistory } from 'react-router-dom';
import "react-native-gesture-handler";

// component imports
import SignInForm from './src/components/SignInForm';
import WelcomePage from './src/components/WelcomePage';
import SignUpForm from './src/components/SignUpForm';
import UserHomePage from './src/components/userside/UserHomePage';

// navigating imports
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList, routerNames } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

const theme = {};

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name={routerNames.home} component={WelcomePage} />
        <Stack.Screen name={routerNames.signIn} component={SignInForm} />
        <Stack.Screen name={routerNames.signUp} component={SignUpForm} />
        <Stack.Screen name={routerNames.userHome} component={UserHomePage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
