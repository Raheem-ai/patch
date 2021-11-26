import React, { useEffect } from "react";
import { Dimensions, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { Colors, ScreenProps } from "../types";
import { HelpRequestAssignment, NotificationType, RequestTypeToLabelMap } from "../../../common/models";
import { useState } from "react";
import { BottomDrawerHandleHeight, BottomDrawerView, IBottomDrawerStore, IDispatchStore, IRequestStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import ResponderRow from "../components/responderRow";
import { timestampToTime } from "../../../common/utils";
import { HeaderHeight } from "../components/header/header";
import { ActiveRequestTabHeight } from "../constants";

type Props = ScreenProps<'HelpRequestDetails'>;

const dimensions = Dimensions.get('screen');

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
            ? timestampToTime(lastChatMessage.timestamp)
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


        const responderIds = request?.assignedResponderIds || [];

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
                                <ResponderRow key={id} responder={responder} orgId={userStore.currentOrgId}/>
                            )
                        })
                    }
                </View>
            )   
        }

        const assignments = () => {
            if (!request?.assignments?.length) {
                return null
            }

            const Assignment = ({assignment, style}: { assignment: HelpRequestAssignment, style?: StyleProp<ViewStyle> }) => {
                const [isOpen, setIsOpen] = useState(false);
                const numResponders = assignment.responderIds.length;

                const toggleOpen = () => {
                    setIsOpen(!isOpen);
                }

                // should be for each sorting each responderId into pending, assigned, declined
                const assignedResponderIds = [];
                const pendingResponderIds = [];
                const declinedResponderIds = [];

                assignment.responderIds.forEach(responderId => {
                    const accepted = request.assignedResponderIds.includes(responderId);
                    const declined = request.declinedResponderIds.includes(responderId);

                    if (accepted) {
                        assignedResponderIds.push(responderId)
                    } else if (declined) {
                        declinedResponderIds.push(responderId)
                    } else {
                        pendingResponderIds.push(responderId)
                    }
                })

                const sendReminders = async () => {
                    const dispatchStore = getStore<IDispatchStore>(IDispatchStore);
                    await dispatchStore.assignRequest(request.id, pendingResponderIds);
                    setIsOpen(false)
                }

                return (
                    <View style={[{ backgroundColor: '#E5E3E5' , borderRadius: 4, padding: 16, flex: 1 }, style]}>
                        <View style={styles.assignmentHeader} onTouchStart={toggleOpen}>
                            <Text>
                                <Text style={styles.assignmentHeaderText}>{`${numResponders} ${numResponders > 1 ? 'people' : 'person'} notified`}</Text>
                                <Text style={styles.assignmentHeaderSubText}>{` · ${timestampToTime(assignment.timestamp)}`}</Text>
                            </Text>
                            <IconButton
                                style={styles.assignmentSelectIcon}
                                icon={isOpen ? 'chevron-up' : 'chevron-down'}
                                color={styles.assignmentSelectIcon.color}
                                size={styles.assignmentSelectIcon.width}/>
                        </View>
                        { isOpen
                            ? <View>
                                {
                                    assignedResponderIds.map((id) => {
                                        const user = userStore.usersInOrg.get(id);

                                        return (
                                            <View style={styles.assignmentRow}>
                                                <Text style={styles.assignmentRowText}>{user.name}</Text>
                                                <IconButton
                                                    style={styles.assignmentAcceptedIcon}
                                                    icon={'check'}
                                                    color={styles.assignmentAcceptedIcon.color}
                                                    size={styles.assignmentAcceptedIcon.width}/>
                                            </View>
                                        )
                                    })
                                }
                                {
                                    declinedResponderIds.map((id) => {
                                        const user = userStore.usersInOrg.get(id);

                                        return (
                                            <View style={styles.assignmentRow}>
                                                <Text style={styles.assignmentRowText}>{user.name}</Text>
                                                <IconButton
                                                    style={styles.assignmentDeclinedIcon}
                                                    icon={'close'}
                                                    color={styles.assignmentDeclinedIcon.color}
                                                    size={styles.assignmentDeclinedIcon.width}/>
                                            </View>
                                        )
                                    })    
                                }
                                {
                                    pendingResponderIds.map((id) => {
                                        const user = userStore.usersInOrg.get(id);

                                        return (
                                            <View style={styles.assignmentRow}>
                                                <Text style={styles.assignmentRowText}>{user.name}</Text>
                                                <IconButton
                                                    style={styles.assignmentPendingIcon}
                                                    icon={'clock-outline'}
                                                    color={styles.assignmentPendingIcon.color}
                                                    size={styles.assignmentPendingIcon.width}/>
                                            </View>
                                        )
                                    })
                                }
                                {
                                    pendingResponderIds.length
                                        ? <View style={{ flexDirection: 'row'}}>
                                            <Text style={styles.assignmentReminderButton} onPress={sendReminders}>{`SEND ${pendingResponderIds.length} REMINDER${pendingResponderIds.length > 1 ? 'S' : ''}`}</Text>
                                        </View>
                                        : null
                                }
                            </View>
                            : null
                        }
                    </View>
                )
            }

            return (
                <View>
                    {
                        request.assignments.map((assignment, i) => {
                            return (
                                <Assignment 
                                    key={i} 
                                    assignment={assignment}
                                    style={[i > 0 ? { marginTop: 16 } : null]}/>
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
                { assignments() }
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

    const height = dimensions.height - HeaderHeight 
        - (requestStore.activeRequest ? ActiveRequestTabHeight : 0)
        - (bottomDrawerStore.showing ? BottomDrawerHandleHeight : 0);
    
    return (
        <View style={{ height: height }}>
            <ScrollView>
                <View style={styles.detailsContainer}>
                    { header() }
                    { notesSection() }
                    { timeAndPlace() }
                    { chatPreview() }
                </View>
                { teamSection() }
            </ScrollView>
        </View>
    );
});

export default HelpRequestDetails;

const styles = StyleSheet.create({
    detailsContainer: {
        flex: 1,
        padding: 16,
        paddingTop: 30,
        marginBottom: 4,
        backgroundColor: '#fff'
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
    assignmentSelectIcon: { 
        width: 30,
        height: 30,
        color: '#838383',
        alignSelf: 'center',
        margin: 0
    },
    assignmentAcceptedIcon: {
        width: 14,
        height: 14,
        backgroundColor: '#55BB76',
        color: '#fff',
        alignSelf: 'center',
        margin: 0,
        marginHorizontal: 8
    },
    assignmentPendingIcon: {
        width: 16,
        height: 16,
        color: '#666666',
        alignSelf: 'center',
        margin: 0,
        marginHorizontal: 7
    },
    assignmentDeclinedIcon: {
        width: 14,
        height: 14,
        color: '#fff',
        backgroundColor: '#D04B00',
        alignSelf: 'center',
        margin: 0,
        marginHorizontal: 8
    },
    assignmentReminderButton: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#694F70',
        margin: 0,
        padding: 0,
        marginTop: 16
    },
    assignmentRow: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'space-between',
        marginTop: 12
    },
    assignmentRowText: {
        fontSize: 14,
        color: '#666666'
    },
    assignmentHeader: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'space-between'
    },
    assignmentHeaderText: {
        color: '#333333',
        fontSize: 14,
        fontWeight: 'bold'
    },
    assignmentHeaderSubText: {
        color: '#666666',
        fontSize: 14
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
        backgroundColor: '#F3F1F3',
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
        flex: 1
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