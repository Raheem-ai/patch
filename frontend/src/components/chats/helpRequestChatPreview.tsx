import React, { useState } from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestStatus, RequestStatusToLabelMap, RequestTypeToLabelMap } from "../../../../common/models";
import { requestStore, userStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { routerNames } from "../../types";
import UserIcon from "../userIcon";
import { ActiveRequestTabHeight } from "../../constants";
import { StatusIcon, StatusSelector } from "../statusSelector";

type Props = {
    request: HelpRequest,
    style?: StyleProp<ViewStyle>,
    onPress?: (event: GestureResponderEvent, request: HelpRequest) => void
};

const HelpRequestChatPreview = observer(({ 
    request, 
    style,
} : Props) => {
    const onCardPress = (event: GestureResponderEvent) => {
        requestStore().setCurrentRequest(request)
        navigateTo(routerNames.helpRequestChat);
    }

    const header = () => {
        const id = request.displayId;
        const hasUnreadMessages = (request.chat && request.chat.messages.length)
                                    && (!request.chat.userReceipts[userStore().user.id] 
                                    || (request.chat.userReceipts[userStore().user.id] < request.chat.lastMessageId));

        return (
            <View style={styles.headerRow}>
                { hasUnreadMessages 
                    ? <View style={styles.unreadMessagesIndicator}/>
                    : <View style={styles.readMessagesIndicator}/>
                }
                <Text style={styles.idText}>{id}</Text>
            </View>
        )
    }

    const details = () => {
        const preview = (request.chat && request.chat.messages.length)
                        ? request.chat.messages[request.chat.lastMessageId - 1].message
                        : 'No messages';

        return (
            <View style={styles.detailsRow}>
                <Text numberOfLines={3}>
                    {preview}
                </Text>
            </View>
        )
    }

    return (
        <Pressable 
            onPress={onCardPress} 
            style={[
                styles.container, 
                style
            ]}>
                {header()}
                {details()}
        </Pressable>
    )
})

export default HelpRequestChatPreview;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginRight: 20,
        marginBottom: 20
    },
    headerRow: {
        height: 22,
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center'
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailsRow: {
        marginTop: 12,
        marginLeft: 60,
        flexDirection: 'row'
    },
    unreadMessagesIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: '#5ACC7F',
        marginHorizontal: (60 - 12)/2
    },
    readMessagesIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: '#CCCACC',
        marginHorizontal: (60 - 12)/2
    },
})