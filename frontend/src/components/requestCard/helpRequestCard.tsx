import React, { useState } from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestStatus, RequestStatusToLabelMap, RequestTypeToLabelMap } from "../../../../common/models";
import { requestStore, userStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { routerNames, Colors } from "../../types";
import UserIcon from "../userIcon";
import { ActiveRequestTabHeight } from "../../constants";
import { StatusIcon, StatusSelector } from "../statusSelector";
import STRINGS from "../../../../common/strings";

type Props = {
    request: HelpRequest,
    style?: StyleProp<ViewStyle>,
    dark?: boolean,
    minimal?: boolean,
    onPress?: (event: GestureResponderEvent, request: HelpRequest) => void
};

const HelpRequestCard = observer(({ 
    request, 
    style,
    dark,
    minimal,
    onPress
} : Props) => {

    const [statusOpen, setStatusOpen] = useState(false);

    const openStatusSelector = (event: GestureResponderEvent) => {
        event.stopPropagation()
        setStatusOpen(true);
    }

    const closeStatusSelector = () => {
        setStatusOpen(false);
    }

    const onCardPress = (event: GestureResponderEvent) => {
        if (statusOpen) {
            closeStatusSelector()
        } else if (onPress) {
            onPress(event, request);
        } else {
            requestStore().setCurrentRequest(request)
            navigateTo(routerNames.helpRequestDetails)
        }
    }

    const header = () => {
        const id = request.displayId;
        const address = request.location?.address.split(',').slice(0, 2).join()
        return (

            <View style={styles.headerRow}>
                <Text style={[styles.idText, dark ? styles.darkText : null]}>{id}</Text>
                {
                    address
                        ? <View style={styles.locationContainer}>
                            <IconButton
                                style={styles.locationIcon}
                                icon='map-marker' 
                                color={styles.locationIcon.color}
                                size={styles.locationIcon.width} />
                            <Text style={[styles.locationText, dark ? styles.darkText : null]}>{address}</Text>
                        </View>
                        : null
                }
            </View>
        )
    }

    const details = () => {
        const type = request.type.map(t => RequestTypeToLabelMap[t]).join(` ${STRINGS.visualDelim} `);
        const notes = request.notes;

        return (
            <View style={styles.detailsRow}>
                <Text numberOfLines={4} style={dark ? styles.darkDetailsText : {}}>
                    <Text style={[styles.typeText, dark ? styles.darkDetailsText : {}]}>{type}: </Text>
                    <Text style={dark ? styles.darkDetailsText : {}}>{notes}</Text>
                </Text>
            </View>
        )
    }

    const status = () => {
        const requestMetadata = requestStore().getRequestMetadata(userStore().user.id, request.id);

        let respondersNeeded = 0;
        
        const joinedResponders = new Set<string>();

        request.positions.forEach(pos => {
            respondersNeeded += pos.min
        })
        
        requestMetadata.positions.forEach(pos => {
            pos.joinedUsers.forEach(userId => joinedResponders.add(userId))
        })

        const respondersToAssign = respondersNeeded - joinedResponders.size;

        const unAssignedResponders = [];
        const assignedResponders = [];

        for (let i = 0; i < respondersToAssign; i++) {
            unAssignedResponders.push(<UserIcon 
                style={{ backgroundColor: dark ? styles.unAssignedResponderIconDark.backgroundColor : styles.unAssignedResponderIcon.backgroundColor }}
                emptyIconColor={styles.unAssignedResponderIcon.color}/>)
        }

        joinedResponders.forEach(userId => {
            const responder = userStore().users.get(userId); 
            assignedResponders.push(<UserIcon user={responder} style={styles.assignedResponderIcon}/>)
        })

        const potentialLabel = RequestStatusToLabelMap[request.status];
        
        const label = typeof potentialLabel == 'string'
            ? potentialLabel
            : potentialLabel(request);

        const hasUnreadMessages = (request.chat && request.chat.messages.length) 
            && (!request.chat.userReceipts[userStore().user.id] 
                || (request.chat.userReceipts[userStore().user.id] < request.chat.lastMessageId));

        const goToChat = (event: GestureResponderEvent) => {
            event.stopPropagation();

            requestStore().setCurrentRequest(request);
            navigateTo(routerNames.helpRequestChat)
        }

        return (
            <View style={styles.statusRow}>
                <View style={styles.responderActions}>
                    <>
                        <View>
                            <IconButton
                                style={[styles.messageIcon, dark ? styles.messageIconDark : null]}
                                icon='message-text' 
                                color={dark ? styles.messageIconDark.color : styles.messageIcon.color}
                                onPress={goToChat}
                                size={28}>
                            </IconButton>
                            { hasUnreadMessages 
                                ? <View style={[styles.unreadMessageNotifier, dark ? styles.darkUnreadMessageNotifier : null]}/>
                                : null
                            }
                        </View>
                        <Text style={{ marginRight: styles.messageIcon.marginRight + 2, alignSelf: 'center' }}>·</Text>
                    </>
                    { assignedResponders }
                    { unAssignedResponders }
                </View>
                {
                    statusOpen
                        ? <StatusSelector dark={dark} style={[styles.statusSelector, dark ? styles.darkStatusSelector : null]} requestId={request.id} onStatusUpdated={closeStatusSelector} />
                        : <View style={styles.statusContainer}>
                            <Text style={[styles.statusText, dark ? styles.darkStatusText : null]}>{label}</Text>
                            {
                                request.status == RequestStatus.Unassigned 
                                    ? null  
                                    : <StatusIcon dark={dark} status={request.status} onPress={openStatusSelector}/>
                            }
                        </View>
                }       
            </View>
        )
    }
    
    let priorityColor;
    switch(request.priority) {
        case 1:
            priorityColor = Colors.okay;
            break;
        case 2:
            priorityColor = Colors.bad;
            break;
        case 0:
            priorityColor = Colors.nocolor; // low-priority == priority not set
            break;
        default:
            priorityColor = Colors.nocolor; // if not using priorities, no need for any colors
    }

    return (
        <Pressable 
            onPress={onCardPress} 
            style={[
                styles.container, 
                dark ? styles.darkContainer: null, 
                minimal ? styles.minimalContainer: null, 
                style,
                {borderTopColor: priorityColor}, 
            ]}>
                {header()}
                { minimal 
                    ? null
                    : details()
                }
                {status()}
        </Pressable>
    )
})

export default HelpRequestCard;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderTopWidth: 4
    },
    darkContainer: {
        backgroundColor: '#3F3C3F',
    },
    minimalContainer: {
        height: ActiveRequestTabHeight + 12,
        paddingBottom: 12,
        justifyContent: 'space-between',
    },
    darkText: {
        color: '#E0DEE0'
    },
    headerRow: {
        margin: 12,
//        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    locationContainer: {
        flexDirection: 'row'
    },
    locationIcon: { 
        width: 12,
        color: '#999',
        alignSelf: 'center',
        margin: 0
    },
    locationText: {
        fontSize: 12,
        alignSelf: 'center'
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    detailsRow: {
        margin: 12,
        marginTop: 0,
        flexDirection: 'row'
    },
    darkDetailsText: {
        color: '#E0DEE0'
    },
    typeText: {
        fontWeight: 'bold'
    },
    statusRow: {
        margin: 12,
        marginTop: 0,
//        height: 28, // <-- why is this set explicitly?
        flexDirection: 'row',
    }, 
    responderActions: {
        flexDirection: 'row',
        flex: 1
    },
    messageIcon: {
        color: '#666',
        backgroundColor: '#fff',
        width: 28,
        height: 28,
        margin: 0,
        marginRight: 4,
        borderRadius: 0
    },
    messageIconDark: {
        color: '#CCCACC',
        backgroundColor: '#444144'
    },
    unreadMessageNotifier: {
        backgroundColor: '#00C95C',
        height: 10,
        width: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: '#fff',
        position: 'absolute',
        top: -2,
        right: 2,
        zIndex: 1
    },
    darkUnreadMessageNotifier: {
        borderColor: '#444144',
    },
    unAssignedResponderIcon: {
        color: '#666',
        backgroundColor: '#F3F1F3',
        borderColor:'#F3F1F3',
        borderStyle: 'solid',
        borderWidth: 1
    }, 
    unAssignedResponderIconDark: {
        color: '#444144',
        backgroundColor: '#CCCACC',
        borderColor:'#CCCACC'
    },
    assignedResponderIcon: {
        marginRight: 4,
    }, 
    broadcastButtonLabel: {
        color: '#DB0000',
        marginVertical: 0,
        marginLeft: 8,
        marginRight: 0,
        alignSelf: 'center'
    }, 
    broadcastButton: {
        marginHorizontal: 0,
        alignSelf: 'center',
        // borderRadius: 16
    }, 
    broadcastContent: { 
        // no other way to touch the internal icon margin :/
        marginLeft: -12,
        marginRight: 0,
        padding: 6,
    },
    statusContainer: {
        flexDirection: 'row'
    },
    statusText: {
        alignSelf: 'center',
    }, 
    darkStatusText: {
        color: '#E0DEE0'
    },
    statusSelector: {
        position: 'absolute',
        flexDirection: 'row',
        right: -6,
        bottom: -6,
        padding: 6,
        zIndex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowRadius: 3,
        shadowColor: '#ccc',
        shadowOpacity: 1,
        shadowOffset: {
            height: 0,
            width: 0
        },
        width: 200
    },
    darkStatusSelector: {
        backgroundColor: '#444144',
    }
})