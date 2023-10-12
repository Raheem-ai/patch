import React from 'react';
import { ColorValue, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Colors, ICONS } from '../types';
import {parseFullName} from 'parse-full-name';
import { userStore } from '../stores/interfaces';
import { observer } from 'mobx-react';
import SelectableText from './helpers/selectableText';

type UserIconProps = {
    userId?: string,
    style?: StyleProp<ViewStyle>,
    large?: boolean
    emptyIconColor?: string
}

const UserIcon = observer(({ 
    userId, 
    style,
    large,
    emptyIconColor
} : UserIconProps) => {

    const user = userStore().users.get(userId);

    if (!user) {
        const resolvedStyle = StyleSheet.flatten(style);

        if (resolvedStyle?.backgroundColor && !resolvedStyle.borderColor) {
            resolvedStyle.borderColor = resolvedStyle.backgroundColor
        }

        return (
            <IconButton
                style={[styles.empty, resolvedStyle]}
                icon={ICONS.responder} 
                color={emptyIconColor || styles.empty.color}
                size={16} />
        )
    }

    const userName = parseFullName(user.name);

    // single names resolve as last name for some reason?!?!
    const first = userName.first || userName.last;
    const last = userName.first ? userName.last : null;

    // for futre ui treatment for users removed from org still in a chat
    const inOrg = userStore().userInOrg(user);

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
            <SelectableText style={[
                { color: styles.userIcon.color },
                large ? { fontSize: styles.large.fontSize } : null
            ]}>{initials}</SelectableText>
        </View>
    )
})

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