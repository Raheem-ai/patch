import React, { useState } from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestStatus, RequestStatusToLabelMap, RequestTypeToLabelMap } from "../../../../common/models";
import { requestStore, userStore, organizationStore } from "../../stores/interfaces";
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
    onMapView?: boolean,
    onPress?: (event: GestureResponderEvent, request: HelpRequest) => void
};

const HelpRequestCard = observer(({ 
    request, 
    style,
    dark,
    minimal,
    onMapView,
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
        const prefix = organizationStore().metadata.requestPrefix;

        const address = request.location?.address.split(',').slice(0, 2).join()
        return (

            <View style={styles.headerRow}>
                <Text style={[styles.idText, dark ? styles.darkText : null]}><Text style={{color: '#999'}}>{prefix}–</Text>{id}</Text>
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
                <Text numberOfLines={minimal ? 1 : onMapView ? 3 : 4} style={dark ? styles.darkDetailsText : {}}>
                    <Text style={[styles.typeText, dark ? styles.darkDetailsText : {}]}>{type}: </Text>
                    <Text style={dark ? styles.darkDetailsText : {}}>{notes}</Text>
                </Text>
            </View>
        )
    }

    const status = () => {
        const requestMetadata = requestStore().getRequestMetadata(userStore().user.id, request.id);

        let respondersNeeded = 0, unfilledSpotsForRequest = 0;
        
        const joinedResponders = new Set<string>();

        request.positions.forEach(pos => {
            respondersNeeded += pos.min;
            // it's possible that more than the minimum number of people join a position
            // we don't want to count them for a different position
            unfilledSpotsForRequest += pos.min - Math.min(pos.min, pos.joinedUsers.length);
        })

        requestMetadata.positions.forEach(pos => {
            pos.joinedUsers.forEach(userId => joinedResponders.add(userId))
        })

        const unAssignedResponders = [];
        const assignedResponders = [];

        // figure out how many open spots there are
        // show an icon if there are any
        if (unfilledSpotsForRequest > 0) {
            unAssignedResponders.push(<UserIcon 
                style={ dark ? styles.unAssignedResponderIconDark : styles.unAssignedResponderIcon }
                emptyIconColor={styles.unAssignedResponderIcon.color}/>);
            // show a stack and count if there are more than one
            if (unfilledSpotsForRequest > 1) {
                unAssignedResponders.push(<IconButton
                    style={[ styles.empty, dark && styles.emptyDark ]}
                    icon='account' 
                    color={Colors.nocolor}
                    size={12} />);
                unAssignedResponders.push(<Text style={[ styles.responderCount, { marginRight: RESPONDER_SPACING_LAST } ]}>{unfilledSpotsForRequest}</Text>)        
            } else {
                unAssignedResponders.push(<Text style={[ styles.responderCount, { marginRight: RESPONDER_SPACING_BASIC } ]}></Text>)
            }
        } 

        // figure out how many people have joined
        // show an icon for each, up to a maximum
        const maxJoinedToShow = 4;
        let i:number = 0;
        joinedResponders.forEach((userId, idx) => {
            const responder = userStore().users.get(userId); 
            if(i < maxJoinedToShow) {
                assignedResponders.push(
                    <View style={{zIndex: 0-i}}>
                        <UserIcon user={responder} style={[
                            styles.assignedResponderIcon,
                            dark 
                                ? styles.assignedResponderIconDark 
                                : null,
                            i < (joinedResponders.size - 1) && (i < maxJoinedToShow - 1) 
                                ? null 
                                : styles.assignedResponderIconLast ]}/>
                    </View>)}
            i++;
        });
        if (joinedResponders.size > maxJoinedToShow) {
            // if there are more who have joined than we're showing
            // show a "stack" icon...
            assignedResponders.push(<IconButton
                style={[ styles.empty, dark && styles.emptyDark ]}
                icon='account' 
                color={Colors.nocolor}
                size={12} />);

            // ...and the total number
            assignedResponders.push(<Text style={[ styles.responderCount, { marginRight: RESPONDER_SPACING_LAST } ]}>{i}</Text>)        

        } else if (joinedResponders.size > 0) {
            // if we're showing everyone who has joined (and it's more than 0) add spacing
            assignedResponders.push(
                <Text style={[ styles.responderCount, { marginRight: RESPONDER_SPACING_BASIC } ]}></Text>)
        }
 
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
                    { assignedResponders }
                    { unAssignedResponders }
                    { hasUnreadMessages &&
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
                    }
                </View>
                {
                    statusOpen
                        ? <StatusSelector dark={dark} style={[styles.statusSelector, dark ? styles.darkStatusSelector : null]} requestId={request.id} onStatusUpdated={closeStatusSelector} />
                        : <Pressable style={styles.statusContainer} onPress={openStatusSelector}>
                            <Text style={[styles.statusText, dark ? styles.darkStatusText : null]}>{label}</Text>
                            {
                                request.status == RequestStatus.Unassigned 
                                    ? null  
                                    : <StatusIcon dark={dark} status={request.status} onPress={openStatusSelector}/>
                            }
                        </Pressable>
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
            priorityColor = Colors.nocolor; // low-priority == priority not set (for now)
            break;
        default:
            priorityColor = Colors.nocolor; // if folks aren't using priorities, let's keep it simple
    }

    return (
        <Pressable 
            onPress={onCardPress} 
            style={[
                styles.container, 
                dark 
                    ? styles.darkContainer 
                    : null, 
                minimal 
                    ? styles.minimalContainer
                    : {borderTopColor: priorityColor}, 
                style, 
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

const RESPONDER_SPACING_BASIC = 6;
const RESPONDER_SPACING_LAST = 12;
const RESPONDER_SPACING_PILED = -8;

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.standard,
        borderBottomColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderTopWidth: 4
    },
    darkContainer: {
        backgroundColor: Colors.backgrounds.dark,
    },
    minimalContainer: {
        height: ActiveRequestTabHeight ,
        paddingBottom: 12,
        paddingHorizontal: 12,
        justifyContent: 'space-evenly',
        borderTopWidth: 0,
        borderBottomWidth: 0,

    },
    darkText: {
        color: '#E0DEE0'
    },
    headerRow: {
        margin: 12,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    locationContainer: {
        flexDirection: 'row'
    },
    locationIcon: { 
        width: 12,
        color: Colors.icons.light,
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
        color: Colors.good,
        backgroundColor: Colors.backgrounds.standard,
        width: 28,
        height: 28,
        margin: 0,
        marginRight: 4,
        borderRadius: 0
    },
    messageIconDark: {
        color: Colors.good,
        backgroundColor: Colors.nocolor
    },
    unreadMessageNotifier: {
        backgroundColor: '#00C95C',
        height: 10,
        width: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.backgrounds.standard,
        position: 'absolute',
        top: -2,
        right: 2,
        zIndex: 1,
        display: 'none'
    },
    darkUnreadMessageNotifier: {
        borderColor: '#444144',
    },
    unAssignedResponderIcon: {
        color: Colors.icons.dark,
        backgroundColor: '#F3F1F3',
        borderColor: Colors.backgrounds.standard,
        borderWidth: 1,
        marginRight: RESPONDER_SPACING_BASIC,
    }, 
    unAssignedResponderIconDark: {
        color: '#444144',
        backgroundColor: '#CCCACC',
        borderColor: Colors.backgrounds.dark,
        borderWidth: 1,
        marginRight: RESPONDER_SPACING_BASIC,
    },
    assignedResponderIcon: {
        marginRight: RESPONDER_SPACING_PILED,
        borderWidth: 1,
        borderColor: Colors.backgrounds.standard,
    }, 
    assignedResponderIconDark: {
        borderColor: Colors.icons.superdark,
    }, 
    assignedResponderIconLast: {
        marginRight: RESPONDER_SPACING_BASIC,
    }, 
    responderCount: {
        alignSelf: 'center',
        marginRight: RESPONDER_SPACING_LAST,
        color: Colors.text.tertiary,
        fontSize: 12
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
        fontSize: 12
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
            height: 2,
            width: 0
        },
        width: 200
    },
    darkStatusSelector: {
        backgroundColor: '#333',
        shadowColor: '#000',
        borderColor: '#444',
        borderWidth: 1,
        paddingHorizontal: 8
    },
    empty: {
        color: Colors.icons.light,
        backgroundColor: Colors.icons.light,
        width: 26,
        height: 26,
        alignSelf: 'center',
        borderRadius: 48,
        marginVertical: 0,
        marginRight: RESPONDER_SPACING_BASIC,
        marginLeft: -30,
        zIndex: -100,
    },
    emptyDark: {
        color: Colors.icons.superdark,
        backgroundColor: Colors.icons.superdark,
    }
})