import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../types';

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
    const userName = user.name;
    const usernameParts = userName.split(' ');

    // either FL for Firstname Lastname or 
    // Fi for Firstname
    let initials = usernameParts.length >= 2
        ? `${usernameParts[0][0]}${usernameParts[usernameParts.length - 1][0]}`.toUpperCase()
        : `${usernameParts[0][0].toUpperCase()}${(usernameParts[0][1] || '').toLowerCase()}`
    
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