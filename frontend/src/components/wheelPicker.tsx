import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Picker from 'react-native-wheel-picker-expo';
import { useWhenParamsChange } from "../hooks/useWhenParamsChange";

export type PickerOption<T = any> = {
    label: string,
    value: T
}

type WheelPickerProps = {
    initialSelectedIndex: number,
    items: PickerOption[],
    onChange: (_: { index: number, item: PickerOption }) => void,
    style?: StyleProp<ViewStyle>
} 

const WheelPicker = ({ 
    initialSelectedIndex, 
    items, 
    onChange,
    style
}: WheelPickerProps) => {
    return (
        <View style={[{ width: 40 }, style]}>
            <Picker
                width={'100%'}
                initialSelectedIndex={initialSelectedIndex}
                items={items}
                onChange={scrollPickerCB(onChange)} />
        </View>
    )
}

const scrollPickerCB = function (fn: ({ index: number, item: PickerOption}) => void) {
    return useWhenParamsChange<{ index: number, item: PickerOption}>(fn, (oldParams, newParams) => {
        return oldParams?.item?.value != newParams.item.value
    })
}

export default WheelPicker;
