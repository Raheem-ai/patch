import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import React from 'react';
import { userStore } from '../stores/interfaces';
import { RootStackParamList, routerNames } from '../types';
import * as Linking from 'expo-linking';

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// TODO: make params required and make consumers pass in params...maybe create a second function that will take 
// any of the routes that don't take params
export function navigateTo<Route extends keyof RootStackParamList>(name: Route, params?: RootStackParamList[Route]) {
  const shouldPush = navigationRef.current?.getCurrentRoute().name == name;

  if (shouldPush) {
    const pushAction = StackActions.push(name, params);
    navigationRef.current?.dispatch(pushAction);
  } else {
    navigationRef.current?.navigate(name, params);
  }
}

export type MainMenuOption = { name: string, routeTo: keyof typeof routerNames, disabled?: boolean }

// immediate function invocation syntax so we can have this stay a constant and consider our environment 
export const MainMenuOptions: MainMenuOption[] = (() => {
    let options: MainMenuOption[] = [
    {
        name: 'Home',
        routeTo: 'userHomePage'
    },
    {
        name: 'Requests',
        routeTo: 'helpRequestList'
    },
    {
        name: 'Channels',
        routeTo: 'chats'
    },
    // {
    //   name: 'Resources',
    //   routeTo: 'home',
    //   disabled: true
    // }, 
    // {
    //   name: 'Schedule',
    //   routeTo: 'signIn',
    //   disabled: true
    // }, 
    {
        name: 'Team',
        routeTo: 'teamList'
    }
    ]

    // if (!runningOnProd) {
    //   options.push({
    //     name: 'Component Lib', 
    //     routeTo: 'componentLib'
    //   })
    // }

    return options
})()

export type SubMenuOption = ({ 
    name: string, 
    onPress: () => void, 
    routeTo?: undefined, 
    disabled?: undefined
} | {  
    name:string, 
    disabled?: boolean,
    routeTo: keyof typeof routerNames, 
    onPress?: undefined 
})

export const SubMenuOptions: SubMenuOption[] = [    
    {
        name: 'Profile',
        onPress: () => {
            userStore().pushCurrentUser(userStore().user);
            navigateTo(routerNames.userDetails);
        }
    }, 
    {
        name: 'Settings',
        routeTo: 'settings',
    }, 
    {
        name: 'Help',
        onPress: () => {
            Linking.openURL('https://help.getpatch.org/');
        }
    }, 
    {
        name: 'Sign out',
        onPress: () => {
            userStore().signOut();
        }
    }
]
