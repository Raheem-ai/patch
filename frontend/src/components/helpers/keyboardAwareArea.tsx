import { observer } from 'mobx-react';
import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';
import { HeaderHeight, InteractiveHeaderHeight, TabbedScreenHeaderHeight } from '../../constants';
import { bottomDrawerStore, navigationStore } from '../../stores/interfaces';

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
        : HeaderHeight

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