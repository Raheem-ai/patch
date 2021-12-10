import { observer } from 'mobx-react';
import React from 'react';
import { Dimensions, View } from 'react-native';
import { ActiveRequestTabHeight } from '../../constants';
import { IBottomDrawerStore, INativeEventStore, IRequestStore } from '../../stores/interfaces';
import { getStore } from '../../stores/meta';
import { HeaderHeight } from '../header/header';

export const VisualArea = observer(function(props) {
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    const height = Dimensions.get('screen').height 
        - HeaderHeight 
        - bottomDrawerStore.bottomUIOffset;

    return (
        <View style={{ height }}>
            { props.children }
        </View>
    )
})

export const BottomDrawerViewVisualArea = observer(function(props) {
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    const nativeEventStore = getStore<INativeEventStore>(INativeEventStore);
    const requestStore = getStore<IRequestStore>(IRequestStore);

    let height = bottomDrawerStore.drawerContentHeight - nativeEventStore.keyboardHeight;

    if (bottomDrawerStore.expanded && !!requestStore.activeRequest && nativeEventStore.keyboardOpen) {
        height += ActiveRequestTabHeight
    }

    return (
        <View style={{ height }}>
            { props.children }
        </View>
    )
})
  