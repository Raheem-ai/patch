import React from 'react';
import { ColorValue, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Colors, ICONS } from '../types';
import {parseFullName} from 'parse-full-name';

type UserIconProps = { 
    user?: { 
        name: string
    }, 
    style?: ViewStyle,
    large?: boolean
    emptyIconColor?: string
}

const UserIcon = ({ 
    user, 
    style,
    large,
    emptyIconColor
} : UserIconProps) => {

    if (!user) {
        if (style?.backgroundColor && !style.borderColor) {
            style.borderColor = style.backgroundColor
        }

        return (
            <IconButton
                style={[styles.empty, style]}
                icon={ICONS.responder} 
                color={emptyIconColor || styles.empty.color}
                size={16} />
        )
    }

    const userName = parseFullName(user.name);

    // single names resolve as last name for some reason?!?!
    const first = userName.first || userName.last;
    const last = userName.first ? userName.last : null;

    // either FL for Firstname Lastname or 
    // Fi for Firstname
    let initials = last
        ? `${first[0]}${last[0]}`.toUpperCase()
        : `${first[0].toUpperCase()}${(first[1] || '').toLowerCase()}`

    // TO DO: differentiate available from unavailable with icon color
    return (
        <View
            style={[
                styles.userIcon, 
                { backgroundColor: Colors.secondary.alpha, borderColor: Colors.secondary.alpha }, 
                large ? styles.large : null,
                style
            ]}
        >
            <Text style={[
                { color: styles.userIcon.color },
                large ? { fontSize: styles.large.fontSize } : null
            ]}>{initials}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    userIcon: {
        color: Colors.text.defaultReversed,
        width: 28,
        height: 28,
        borderRadius: 20,
        margin: 0,
        padding: 0,
        marginRight: 4,
        borderStyle: 'solid',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    large: {
        width: 36,
        height: 36,
        borderRadius: 20,
        fontSize: 18
    },
    empty: {
        color: '#A9A7A9',
        backgroundColor: '#F3F1F3',
        width: 28,
        height: 28,
        borderRadius: 20,
        margin: 0,
        marginRight: 4,
        borderColor:'#F3F1F3',
        borderStyle: 'solid',
        borderWidth: 1
    }, 
})

export default UserIcon;