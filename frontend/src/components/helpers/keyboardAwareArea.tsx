import { observer } from 'mobx-react';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { ActiveRequestTabHeight, HeaderHeight, InteractiveHeaderHeight, isAndroid, TabbedScreenHeaderHeight } from '../../constants';
import { bottomDrawerStore } from '../../stores/interfaces';
import Constants from 'expo-constants';

type KeyboardAwareProps = React.PropsWithChildren<{
    insideTabView?: boolean;
    style?: StyleProp<ViewStyle>
}>

const KeyboardAwareArea = observer(function(props: KeyboardAwareProps) {

    const isInNonMinimizableBottomDrawerView = bottomDrawerStore().showing
        && bottomDrawerStore().expanded
        && !bottomDrawerStore().minimizable;

    const headerOffset = isInNonMinimizableBottomDrawerView
        ? InteractiveHeaderHeight
        : isAndroid
            ? Constants.statusBarHeight
            : HeaderHeight;

    const verticalOffset = headerOffset 
        + (props.insideTabView
            ? TabbedScreenHeaderHeight
            : 0) 

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={[{ flex: 1 }, props.style]}
            keyboardVerticalOffset={verticalOffset}
        >
            { props.children }
        </KeyboardAvoidingView>
    )
})

export default KeyboardAwareArea;