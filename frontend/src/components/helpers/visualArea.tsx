import { observer } from 'mobx-react';
import React from 'react';
import { Dimensions, View } from 'react-native';
import { IBottomDrawerStore } from '../../stores/interfaces';
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
  