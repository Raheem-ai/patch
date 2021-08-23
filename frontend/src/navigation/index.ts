import { NavigationContainerRef } from '@react-navigation/native';
import React from 'react';
import { RootStackParamList } from '../types';

export const navigationRef = React.createRef<NavigationContainerRef>();

export function navigateTo<Route extends keyof RootStackParamList>(name: Route, params: RootStackParamList[Route]) {
  navigationRef.current?.navigate(name, params);
}