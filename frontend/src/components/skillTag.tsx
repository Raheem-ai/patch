import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { RequestSkill, RequestSkillToLabelMap } from '../../../common/models';

type Props = {
    skill: RequestSkill,
    type?: 'needed' | 'fulfillable' | 'fulfilled',
    large?: boolean,
    style?: StyleProp<ViewStyle>
}

export default function SkillTag(props: Props) {
    const needed = props.type == 'needed';
    const fulfillable = props.type == 'fulfillable';
    const fulfilled = props.type == 'fulfilled';

    const label = RequestSkillToLabelMap[props.skill];
    
    return (
        <View 
            style={[
                styles.tagContainer, 
                !!props.type 
                    ? props.large 
                        ? styles.largePaddedContainer
                        : styles.paddedContainer 
                    : null,
                !!props.type ? styles[props.type] : null,
                props.style
            ]}
        >
            <Text style={[
                styles.tagText,
                props.large ? styles.largeTagText : null,
                !!props.type ? { color: styles[props.type].color } : null
            ]}>{label}</Text>
        </View>
    )
                

}

const styles = StyleSheet.create({
    tagContainer: {
        borderRadius: 6,
        marginRight: 4,
        justifyContent: 'center'
    },
    largePaddedContainer: {
        padding: 8
    },
    paddedContainer: {
        padding: 4,
    },
    needed: {
        color: '#7F7C7F',
        borderWidth: 1,
        borderColor: '#CCCACC'
    }, 
    fulfillable: {
        color: '#333333',
        backgroundColor: '#EEEEEE'
    }, 
    fulfilled: {
        color: '#fff',
        backgroundColor: '#A3A0A0'
    }, 
    tagText: {
        alignSelf: 'center',
        fontSize: 12,
        color: '#7F7C7F'
    },
    largeTagText: {
        fontSize: 14
    }
})