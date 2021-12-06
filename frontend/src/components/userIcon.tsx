import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../types';
import {parseFullName} from 'parse-full-name';

type UserIconProps = { 
    user: { 
        name: string
    }, 
    style?: StyleProp<ViewStyle> ,
    large?: boolean
}

const UserIcon = ({ 
    user, 
    style,
    large 
} : UserIconProps) => {
    const userName = parseFullName(user.name);

    // single names resolve as last name for some reason?!?!
    const first = userName.first || userName.last;
    const last = userName.first ? userName.last : null;

    // either FL for Firstname Lastname or 
    // Fi for Firstname
    let initials = last
        ? `${first[0]}${last[0]}`.toUpperCase()
        : `${first[0].toUpperCase()}${(first[1] || '').toLowerCase()}`
    
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
        color: '#fff',
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
    }
})

export default UserIcon;