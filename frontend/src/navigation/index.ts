import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import React from 'react';
import { userStore } from '../stores/interfaces';
import { RootStackParamList, routerNames } from '../types';
import * as Linking from 'expo-linking';
import TestIds from '../test/ids';
import { inProdApp } from '../config';

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// TODO: make params required and make consumers pass in params...maybe create a second function that will take 
// any of the routes that don't take params
export function navigateTo<Route extends keyof RootStackParamList>(name: Route, params?: RootStackParamList[Route]) {
  const shouldPush = navigationRef.current?.getCurrentRoute().name == name;
  //console.log("SHOULD PUSH", shouldPush);

  if (shouldPush) {
    const pushAction = StackActions.push(name, params);
    navigationRef.current?.dispatch(pushAction);
  } else {
    navigationRef.current?.navigate(name, params);
  }
}

export type MainMenuOption = { 
    name: string, 
    testId: string,
    routeTo: keyof typeof routerNames, 
    disabled?: boolean 
}

// immediate function invocation syntax so we can have this stay a constant and consider our environment 
export const MainMenuOptions: MainMenuOption[] = (() => {
    let options: MainMenuOption[] = [
        {
          name: 'Home',
          routeTo: 'userHomePage',
          testId: TestIds.header.navigation.home
        },
        {
          name: 'Requests',
          routeTo: 'helpRequestList',
          testId: TestIds.header.navigation.requests
        },
        {
          name: 'Channels',
          routeTo: 'chats',
          testId: TestIds.header.navigation.channels
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
          routeTo: 'teamList',
          testId: TestIds.header.navigation.team
        },
    ]

    if (!inProdApp) {
      options.push({
        name: 'Component Lib', 
        routeTo: 'componentLib',
        testId: TestIds.header.navigation.channels
      })
    }

    return options
})()

export type SubMenuOption = ({ 
    name: string, 
    testId: string,
    onPress: () => void, 
    routeTo?: undefined, 
    disabled?: undefined
} | {  
    name:string,
    testId: string,
    disabled?: boolean,
    routeTo: keyof typeof routerNames, 
    onPress?: undefined 
})

export const SubMenuOptions: SubMenuOption[] = [    
    {
        name: 'Profile',
        testId: TestIds.header.submenu.profile,
        onPress: () => {
            userStore().pushCurrentUser(userStore().user);
            navigateTo(routerNames.userDetails);
        }
    }, 
    {
        name: 'Settings',
        routeTo: 'settings',
        testId: TestIds.header.submenu.settings
    }, 
    {
        name: 'Help & Information',
        routeTo: 'helpAndInfo',
        testId: TestIds.header.submenu.helpAndInfo
    }, 
    {
        name: 'Sign out',
        testId: TestIds.header.submenu.signOut,
        onPress: () => {
            userStore().signOut();
        }
    }
]
