import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import React from 'react';
import { IUserStore, userStore } from '../stores/interfaces';
import { RootStackParamList, routerNames } from '../types';

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

export const MainMenuOptions: MainMenuOption[] = [
  {
    name: 'Home',
    routeTo: 'userHomePage'
  },
  {
    name: 'Requests',
    routeTo: 'helpRequestMap'
  }, 
  {
    name: 'Resources',
    routeTo: 'home',
    disabled: true
  }, 
  {
    name: 'Schedule',
    routeTo: 'signIn',
    disabled: true
  }, 
  {
    name: 'Team',
    routeTo: 'teamList'
  }
]

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
    name: 'Settings',
    routeTo: 'userHomePage',
    disabled: true
  }, 
  {
    name: 'Help',
    routeTo: 'userHomePage',
    disabled: true
  }, 
  {
    name: 'Log out',
    onPress: () => {
      userStore().signOut();
    }
  }
]