import Constants from 'expo-constants';
import { observer } from 'mobx-react';
import React from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Platform, View } from 'react-native';
import { ActiveRequestTabHeight } from '../../constants';
import { BottomDrawerHandleHeight, IBottomDrawerStore, INativeEventStore, IRequestStore } from '../../stores/interfaces';
import { getStore } from '../../stores/meta';
import { HeaderHeight } from '../header/header';

export const VisualArea = observer(function(props) {
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    return (
        <Animated.View
            style={{ height: bottomDrawerStore.contentHeight }}>
            { props.children }
        </Animated.View>
    )
})

export const BottomDrawerViewVisualArea = observer(function(props) {
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    return (
        <Animated.View
            style={{ height: bottomDrawerStore.drawerContentHeight }}>
            { props.children }
        </Animated.View>
    )
})
  