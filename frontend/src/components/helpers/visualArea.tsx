import { observer } from 'mobx-react';
import React from 'react';
import { Animated } from 'react-native';
import { bottomDrawerStore } from '../../stores/interfaces';

export const VisualArea = observer(function(props) {
    return (
        <Animated.View
            style={{ height: bottomDrawerStore().contentHeight }}>
            { props.children }
        </Animated.View>
    )
})

export const BottomDrawerViewVisualArea = observer(function(props) {
    return (
        <Animated.View
            style={{ height: bottomDrawerStore().drawerContentHeight }}>
            { props.children }
        </Animated.View>
    )
})
  