import React from 'react'
import { GestureResponderEvent, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { GestureEvent } from 'react-native-gesture-handler';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

type Props = {
    frontColor: string,
    backColor: string
    innerSize: number,
    totalSize: number,
    onPress?: (event: GestureResponderEvent) => void
    style?: StyleProp<ViewStyle>
}

export default function PartiallyAssignedIcon(props: Props) {
    // have no idea why this works!!!
    const viewBox = `0 0 14 14`;
    
    return (
        <Pressable style={[{
            height: props.totalSize,
            width: props.totalSize,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: props.frontColor,
            borderStyle: 'solid',
            borderRadius: props.totalSize
        }, props.style]}
        onPress={props.onPress}>
            <Svg width={props.innerSize} height={props.innerSize} viewBox={viewBox} >
                <Path d="M9.33301 6.41675C10.3013 6.41675 11.0772 5.63508 11.0772 4.66675C11.0772 3.69841 10.3013 2.91675 9.33301 2.91675C8.36467 2.91675 7.58301 3.69841 7.58301 4.66675C7.58301 5.63508 8.36467 6.41675 9.33301 6.41675ZM4.66634 6.41675C5.63467 6.41675 6.41051 5.63508 6.41051 4.66675C6.41051 3.69841 5.63467 2.91675 4.66634 2.91675C3.69801 2.91675 2.91634 3.69841 2.91634 4.66675C2.91634 5.63508 3.69801 6.41675 4.66634 6.41675ZM4.66634 7.58342C3.30717 7.58342 0.583008 8.26592 0.583008 9.62508V11.0834H8.74967V9.62508C8.74967 8.26592 6.02551 7.58342 4.66634 7.58342ZM9.33301 7.58342C9.16384 7.58342 8.97134 7.59508 8.76717 7.61258C9.44384 8.10258 9.91634 8.76175 9.91634 9.62508V11.0834H13.4163V9.62508C13.4163 8.26592 10.6922 7.58342 9.33301 7.58342Z" fill={props.backColor}/>
                <Path d="M4.66634 6.41675C5.63467 6.41675 6.41051 5.63508 6.41051 4.66675C6.41051 3.69841 5.63467 2.91675 4.66634 2.91675C3.69801 2.91675 2.91634 3.69841 2.91634 4.66675C2.91634 5.63508 3.69801 6.41675 4.66634 6.41675ZM4.66634 7.58342C3.30717 7.58342 0.583008 8.26592 0.583008 9.62508V11.0834H8.74967V9.62508C8.74967 8.26592 6.02551 7.58342 4.66634 7.58342Z" fill={props.frontColor} />
            </Svg>
        </Pressable>
  );
}

//fill-opacity="0.6"