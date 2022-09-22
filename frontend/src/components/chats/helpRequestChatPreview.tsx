import React from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text, IconButton } from "react-native-paper";
import { HelpRequest, RequestDetailsTabs } from "../../../../common/models";

import { requestStore, userStore, organizationStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { Colors, routerNames, ICONS } from "../../types";
import { requestDisplayName } from "../../../../common/utils/requestUtils"
import STRINGS from "../../../../common/strings";

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
            initialTab: RequestDetailsTabs.Channel
        })
    }

    const unreadIndicator = () => {
        const hasUnreadMessages = (request.chat && request.chat.messages.length)
                                    && (!request.chat.userReceipts[userStore().user.id] 
                                    || (request.chat.userReceipts[userStore().user.id] < request.chat.lastMessageId));

        return (
            <View style={styles.indicatorContainer}>
                { hasUnreadMessages 
                    ? <View style={styles.unreadMessagesIndicator}/>
                    : <View style={styles.readMessagesIndicator}/>
                }
            </View>
        )
    }

    const details = () => {
        const id = request.displayId;
        const prefix = organizationStore().metadata.requestPrefix;
        const lastMessageUser = userStore().users.get(request.chat?.messages[request.chat.messages.length - 1].userId);

        const preview = (request.chat && request.chat.messages.length)
                        ? <Text style={styles.detailText}><Text style={styles.nameText}>{lastMessageUser ? lastMessageUser.name + ': ' : ''}</Text> {request.chat.messages[request.chat.messages.length - 1].message}</Text>
                        : STRINGS.CHANNELS.noMessages;

        return (
            <View style={{flexDirection: 'column', flex: 1}}>
                <View style={styles.headerRow}>
                    <Text style={styles.idText}>{requestDisplayName(prefix, id)}</Text>
                </View>
                <View style={styles.detailsRow}>
                    <Text style={styles.detailText} numberOfLines={3}>
                        {preview}
                    </Text>
                </View>
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
                <View style={{flexDirection: 'row'}}>
                    {unreadIndicator()}
                    <View style={styles.detailsAndIcon}>
                        {details()}
                        <IconButton
                            style={styles.goToChannelIcon}
                            icon={ICONS.openListItem} 
                            color={styles.goToChannelIcon.color}
                            size={styles.goToChannelIcon.width} />
                        </View>
                </View>
        </Pressable>
    )
})

export default HelpRequestChatPreview;

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.standard,
    },
    detailsAndIcon: {
        borderBottomColor: Colors.borders.list,
        borderBottomWidth: 1,
        flexDirection: 'row',
        flex: 1,
        paddingRight: 12,
        paddingVertical: 16
    },
    headerRow: {
        marginBottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 16
    },
    indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1
    },
    detailsRow: {
        marginTop: 4,
        flexDirection: 'row',
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
    goToChannelIcon: {
        color: '#CCCACC',
        width: 30,
        height: 30,
        margin: 0,
        padding: 0,
        marginLeft: 12,
        alignSelf: 'center'
    },
})