import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { Switch, Route, BrowserRouter as Router, useHistory } from 'react-router-dom';
import "react-native-gesture-handler";

// component imports
import SignInForm from './components/SignInForm';
import WelcomePage from './components/WelcomePage';
import SignUpForm from './components/SignUpForm';

// navigating imports
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={WelcomePage} />
        <Stack.Screen name="SignIn" component={SignInForm} />
        <Stack.Screen name="SignUp" component={SignUpForm} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
