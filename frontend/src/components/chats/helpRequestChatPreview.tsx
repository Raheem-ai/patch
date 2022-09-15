import React from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { HelpRequest } from "../../../../common/models";
import { requestStore, userStore, organizationStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { Colors, routerNames } from "../../types";
import { requestDisplayName } from "../../../../common/utils/requestUtils"

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
        navigateTo(routerNames.helpRequestDetails, {
            initialTab: 'Channel'
        })
    }

    const header = () => {
        const id = request.displayId;
        const prefix = organizationStore().metadata.requestPrefix;

        const hasUnreadMessages = (request.chat && request.chat.messages.length)
                                    && (!request.chat.userReceipts[userStore().user.id] 
                                    || (request.chat.userReceipts[userStore().user.id] < request.chat.lastMessageId));

        return (
            <View style={styles.headerRow}>
                { hasUnreadMessages 
                    ? <View style={styles.unreadMessagesIndicator}/>
                    : <View style={styles.readMessagesIndicator}/>
                }
                <Text style={styles.idText}>{requestDisplayName(prefix, id)}</Text>
            </View>
        )
    }

    const details = () => {
        const preview = (request.chat && request.chat.messages.length)
                        ? <Text style={styles.detailText}><Text style={styles.nameText}>{userStore().users.get(request.chat.messages[request.chat.messages.length - 1].userId).name + ': '}</Text> {request.chat.messages[request.chat.messages.length - 1].message}</Text>
                        : 'No messages yet';

        return (
            <View style={styles.detailsRow}>
                <Text style={styles.detailText} numberOfLines={3}>
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
        backgroundColor: Colors.backgrounds.standard,
    },
    headerRow: {
        height: 22,
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingRight: 16
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailsRow: {
        marginTop: 4,
        marginLeft: 56,
        flexDirection: 'row',
        paddingBottom: 16,
        borderBottomColor: Colors.borders.list,
        borderBottomWidth: 1,
        paddingRight: 16
    },
    detailText: {
        color: Colors.text.tertiary
    },
    nameText: {
        color: Colors.text.tertiary,
        fontWeight: '700',
    },
    unreadMessagesIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: Colors.good,
        marginHorizontal: (56 - 12)/2,
    },
    readMessagesIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: Colors.icons.superlight,
        marginHorizontal: (56 - 12)/2
    },
})