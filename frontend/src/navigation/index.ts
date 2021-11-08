import { NavigationContainerRef } from '@react-navigation/native';
import React from 'react';
import { IUserStore } from '../stores/interfaces';
import { getStore } from '../stores/meta';
import { RootStackParamList, routerNames } from '../types';

export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// TODO: make params required and make consumers pass in params...maybe create a second function that will take 
// any of the routes that don't take params
export function navigateTo<Route extends keyof RootStackParamList>(name: Route, params?: RootStackParamList[Route]) {
  navigationRef.current?.navigate(name, params);
}

export type MainMenuOption = { name: string, routeTo: keyof typeof routerNames }

export const MainMenuOptions: MainMenuOption[] = [
  {
    name: 'Requests',
    routeTo: 'helpRequestMap'
  }, 
  {
    name: 'Resources',
    routeTo: 'home'
  }, 
  {
    name: 'Schedule',
    routeTo: 'signIn'
  }, 
  {
    name: 'Team',
    routeTo: 'userHomePage'
  }
]

export type SubMenuOption = ({ 
  name: string, 
  onPress: () => void, 
  routeTo?: undefined 
} | {  
  name:string, 
  routeTo: keyof typeof routerNames, 
  onPress?: undefined 
})

export const SubMenuOptions: SubMenuOption[] = [
  {
    name: 'Settings',
    routeTo: 'createHelpRequest'
  }, 
  {
    name: 'Help',
    routeTo: 'createHelpRequest'
  }, 
  {
    name: 'Log out',
    onPress: () => {
      const userStore = getStore<IUserStore>(IUserStore);
      userStore.signOut();
    }
  }
]