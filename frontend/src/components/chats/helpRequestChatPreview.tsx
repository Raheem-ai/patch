import React from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { HelpRequest } from "../../../../common/models";
import { requestStore, userStore, organizationStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { Colors, routerNames } from "../../types";

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

        const prefix = organizationStore().metadata.requestPrefix;
/*
        const prefix = async () => {
            try {
                const response:any = await organizationStore().metadata.requestPrefix;
                if (!response.ok) {
                    throw new Error(`Response not ok: ${response.status}`);
                }
                const prefix = await response;

                return prefix
            }
            catch(error) {
                console.error(`Could not get prefix: ${error}`);
            }
        }

        console.log('returned: ', prefix.);
*/

        const hasUnreadMessages = (request.chat && request.chat.messages.length)
                                    && (!request.chat.userReceipts[userStore().user.id] 
                                    || (request.chat.userReceipts[userStore().user.id] < request.chat.lastMessageId));

        return (
            <View style={styles.headerRow}>
                { hasUnreadMessages 
                    ? <View style={styles.unreadMessagesIndicator}/>
                    : <View style={styles.readMessagesIndicator}/>
                }
                <Text style={styles.idText}><Text>{prefix}–</Text>{id}</Text>
            </View>
        )
    }

    const details = () => {
        const preview = (request.chat && request.chat.messages.length)
                        ? userStore().users.get(request.chat.messages[request.chat.messages.length - 1].userId).name + ': ' + request.chat.messages[request.chat.messages.length - 1].message
                        : '…';

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
        backgroundColor: '#fff',
        marginRight: 20,
        marginVertical: 16
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
        marginTop: 4,
        marginLeft: 60,
        flexDirection: 'row',
    },
    detailText: {
        color: Colors.text.tertiary
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
        backgroundColor: Colors.icons.superlight,
        marginHorizontal: (60 - 12)/2
    },
})