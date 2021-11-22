import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { Colors, ScreenProps } from "../types";
import { NotificationType, RequestTypeToLabelMap } from "../../../common/models";
import { useState } from "react";
import { BottomDrawerView, IBottomDrawerStore, IRequestStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import ResponderRow from "../components/responderRow";

type Props = ScreenProps<'HelpRequestDetails'>;

const HelpRequestDetails = observer(({ navigation, route }: Props) => {
    const requestStore = getStore<IRequestStore>(IRequestStore);
    const userStore = getStore<IUserStore>(IUserStore);
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    const [notification, setNotification] = useState<Props['route']['params']['notification']>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const params = route.params;

            if (params && params.notification) {
                switch (params.notification.type) {
                    case NotificationType.AssignedIncident:
                        // ui specific to assignment
                        break;
                    case NotificationType.BroadCastedIncident:
                        // ui specific to broadcasting
                        break;
                }

                // call store method to get helprequest from api (so we have latest value)
                // and update it's state while this shows loading ui
                await requestStore.pushRequest(params.notification.payload.id);
                setNotification(params.notification);
                setIsLoading(false);
            } else {
                // got here through normal navigation...caller should worry about having up to date copy
                setIsLoading(false)
            }
        })();
    }, []);

    const notesSection = () => {
        const notes = isLoading
            ? '' 
            : requestStore.currentRequest.notes;
        
        return (
            <View style={styles.notesSection}>
                <Text>{notes}</Text>
            </View>
        )
    }

    const timeAndPlace = () => {
        const address = isLoading
            ? ''
            : requestStore.currentRequest.location.address.split(',').slice(0, 2).join();

        const time = isLoading
            ? ''
            : new Date(requestStore.currentRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        return (
            <View style={styles.timeAndPlaceSection}>
                <View style={styles.timeAndPlaceRow}>
                    <IconButton
                        style={styles.locationIcon}
                        icon='map-marker' 
                        color={styles.locationIcon.color}
                        size={styles.locationIcon.width} />
                    <Text style={styles.locationText}>{address}</Text>
                </View>
                <View style={styles.timeAndPlaceRow}>
                    <IconButton
                        style={styles.timeIcon}
                        icon='clock-outline' 
                        color={styles.timeIcon.color}
                        size={styles.timeIcon.width} />
                    <Text style={styles.timeText}>{time.toLocaleString()}</Text>
                </View>
            </View>
        )
    }

    const header = () => {
        const tags = isLoading
            ? []
            : requestStore.currentRequest.type.map(typ => RequestTypeToLabelMap[typ])

        const edit = () => {
            bottomDrawerStore.show(BottomDrawerView.editRequest, true)
        }

        return (
            <View style={styles.headerContainer}>
                <View style={styles.typeLabelContainer}>
                    <Text style={styles.typeLabel}>{tags.join(' · ')}</Text>
                </View>
                <View>
                    <IconButton
                        onPress={edit}
                        style={styles.editIcon}
                        icon='pencil' 
                        color={styles.editIcon.color}
                        size={styles.editIcon.width} />
                </View>
            </View>
        )
    }

    const chatPreview = () => {

        const lastChatMessage = isLoading
            ? null
            : requestStore.currentRequest.chat?.messages[requestStore.currentRequest.chat.messages.length - 1];

        const chatMessageText = !!lastChatMessage
            ? lastChatMessage.message
            : '';

        const lastMessageAuthor = !!lastChatMessage
            ? userStore.usersInOrg.get(lastChatMessage.userId)?.name
            : ''

        const lastMessageTime = !!lastChatMessage
            ? new Date(lastChatMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''

        const hasUnreadMessages = !isLoading && (requestStore.currentRequest.chat && requestStore.currentRequest.chat.messages.length) 
            && (!requestStore.currentRequest.chat.userReceipts[userStore.user.id] 
                || (requestStore.currentRequest.chat.userReceipts[userStore.user.id] < requestStore.currentRequest.chat.lastMessageId));

        const openChat = () => {
            bottomDrawerStore.show(BottomDrawerView.requestChat, true);
        }

        return (
            <View style={styles.chatContainer} onTouchStart={openChat}>

                <View style={styles.chatLabelContainer}>
                    <IconButton
                        style={styles.chatIcon}
                        icon='forum'
                        color={styles.chatIcon.color}
                        size={styles.chatIcon.width} />
                    <Text style={styles.chatLabel}>CHAT</Text>
                </View>

                <View style={styles.chatPreviewContainer}>
                    {
                        !!chatMessageText
                            ? <View>
                                <View style={styles.chatPreviewHeader}>
                                    <Text>
                                        <Text style={styles.chatAuthorLabel}>{lastMessageAuthor}</Text>
                                        <Text>{` · ${lastMessageTime}`}</Text>
                                    </Text>
                                    {
                                        hasUnreadMessages
                                            ? <View style={styles.newLabelContainer}>
                                                <Text style={styles.newLabel}>NEW</Text>
                                              </View>
                                            : null
                                    }
                                </View>
                                <Text>{chatMessageText}</Text>
                              </View>
                            : <Text>Start chat for this response</Text>
                    }
                </View>
            </View>
        )
    }

    const teamSection = () => {
        const request = isLoading
            ? null
            : requestStore.currentRequest;

        const responderIds = request?.responderIds || [];

        const addResponders = () => {
            bottomDrawerStore.show(BottomDrawerView.assignResponders, true);
        }

        const teamHeader = () => {
            return (
                <View style={styles.teamHeader}>
                    <View style={styles.teamLabelContainer}>
                        <IconButton
                            style={styles.teamIcon}
                            icon='account-multiple'
                            color={styles.teamIcon.color}
                            size={styles.teamIcon.width} />
                        <Text style={styles.teamLabel}>TEAM</Text>
                    </View>
                    <View>
                        <IconButton
                            onPress={addResponders}
                            style={styles.addResponderIcon}
                            icon='account-plus'
                            color={styles.addResponderIcon.color}
                            size={styles.addResponderIcon.width} />
                    </View>
                </View>
            )
        }

        const responders = () => {
            if (!responderIds.length) {
                return null;
            }

            return (
                <View style={styles.respondersContainer}>
                    {
                        responderIds.map((id) => {
                            const responder = userStore.usersInOrg.get(id);
                            return (
                                <ResponderRow responder={responder} orgId={userStore.currentOrgId}/>
                            )
                        })
                    }
                </View>
            )   
        }

        return (
            <View style={styles.teamSection}>
                { teamHeader() }
                { responders() }
                <Button 
                    uppercase={false}
                    onPress={addResponders}
                    color={styles.addResponderButton.color}
                    icon='account-plus' 
                    style={styles.addResponderButton}>Add responders</Button>
            </View>
        )
    }

    if (isLoading) {
        return null
    }

    return (
        <>
            <View style={styles.container}>
                { header() }
                { notesSection() }
                { timeAndPlace() }
                { chatPreview() }
            </View>
            { teamSection() }
        </>
    );
});

export default HelpRequestDetails;

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingTop: 30,
        marginBottom: 4
    },
    notesSection: {
        marginBottom: 16
    },
    timeAndPlaceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    timeAndPlaceRow: {
        flexDirection: 'row',
    },
    locationIcon: { 
        width: 14,
        color: '#666',
        alignSelf: 'center',
        margin: 0
    },
    locationText: {
        fontSize: 14,
        alignSelf: 'center',
        color: '#666',
        marginLeft: 2
    },
    timeIcon: { 
        width: 14,
        color: '#666',
        alignSelf: 'center',
        margin: 0
    },
    timeText: {
        fontSize: 14,
        alignSelf: 'center',
        color: '#666',
        marginLeft: 2
    },
    headerContainer: {
        marginBottom: 16,
        flexDirection: "row",
        justifyContent: 'space-between'
    },
    typeLabelContainer: {
        flex: 1
    },
    typeLabel: {
        fontSize: 17,
        fontWeight: 'bold'
    },
    editIcon: {
        width: 20,
        height: 20,
        color: '#999',
        alignSelf: 'flex-start',
        margin: 0
    },
    chatContainer: {
        
    },
    chatLabelContainer: {
        flexDirection: 'row',
        marginBottom: 4
    },
    chatLabel: {
        marginLeft: 4,
        alignSelf: 'center',
        color: '#111',
        fontWeight: 'bold'
    },
    chatIcon: {
        width: 20,
        color: '#333',
        alignSelf: 'center',
        margin: 0
    },
    chatAuthorLabel: {
        fontWeight: 'bold'
    },
    newLabelContainer: {
        borderRadius: 2,
        justifyContent:'center',        
        backgroundColor: '#64B67B'
    },
    newLabel: {
        paddingHorizontal: 5,
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold'
    },
    chatPreviewContainer: {
        padding: 12,
        borderColor: '#ddd',
        borderRadius: 6,
        borderWidth: 2,
        borderStyle: 'solid',
        maxHeight: 300
    }, 
    chatPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    teamSection: {
        flex: 1,
        backgroundColor: '#e0e0e0',
        padding: 16,
        paddingTop: 30,
    },
    teamLabelContainer: {
        flexDirection: 'row',
        marginBottom: 4
    },
    teamLabel: {
        marginLeft: 4,
        alignSelf: 'center',
        color: '#111',
        fontWeight: 'bold'
    },
    teamIcon: {
        width: 20,
        color: '#333',
        alignSelf: 'center',
        margin: 0
    },
    addResponderIcon: {
        width: 20,
        color: '#999',
        alignSelf: 'center',
        margin: 0
    },
    teamHeader: {
        flexDirection: "row",
        justifyContent: 'space-between',
        marginBottom: 12
    },
    addResponderButton: {
        height: 44,
        borderRadius: 24,
        color: '#fff',
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        marginTop: 12
    },
    respondersContainer: {
        
    },
    responderRow: {
        flexDirection: 'row',
        alignContent: 'center',
        marginBottom: 12
    },
    dispatcherContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        height: 18,
        marginLeft: 4
    },
    dispatchIcon: {
        color: '#7F7C7F',
        width: 12,
        margin: 0,
        alignSelf: 'center',
    },
    dispatcherLabelContainer: {
        justifyContent: 'center',
        marginLeft: 4
    },
    dispatcherLabel: {
        color: '#7F7C7F',
        fontSize: 12,
    },
    responderLabel: {
        fontWeight: 'bold',
        fontSize: 14
    },
    responderHeader: {
        flexDirection: 'row',
        alignContent: 'center',
        height: 18
    },
    userIconContainer: {
        marginRight: 4
    },
    skillLabel: {
        color: '#7F7C7F',
        fontSize: 12
    }
})