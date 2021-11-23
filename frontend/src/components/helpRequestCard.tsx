import React, { useState } from "react";
import { observer } from "mobx-react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestStatus, RequestStatusToLabelMap, RequestTypeToLabelMap } from "../../../common/models";
import PartiallyAssignedIcon from "./icons/partiallyAssignedIcon";
import { getStore } from "../stores/meta";
import { IRequestStore, IUserStore } from "../stores/interfaces";
import { navigateTo } from "../navigation";
import { routerNames } from "../types";
import UserIcon from "./userIcon";
import { ActiveRequestTabHeight } from "../constants";

type Props = {
    request: HelpRequest,
    style?: StyleProp<ViewStyle>,
    dark?: boolean,
    minimal?: boolean
};

export const RequestStatusToIconMap: { [key in RequestStatus]: string | ((onPress: () => void, style?: StyleProp<ViewStyle>) => JSX.Element) } = {
    [RequestStatus.Unassigned]: '',
    [RequestStatus.PartiallyAssigned]: (onPress: () => void, style?: StyleProp<ViewStyle>) => {
        return (
            <PartiallyAssignedIcon 
                frontColor={'#000'} 
                backColor={'#999'} 
                innerSize={16} 
                totalSize={28}
                onPress={onPress}
                style={[{
                    marginLeft: 4
                }, style]}/>
        )
    },
    [RequestStatus.Ready]: 'account-multiple',
    [RequestStatus.OnTheWay]: 'arrow-right',
    [RequestStatus.OnSite]: 'map-marker',
    [RequestStatus.Done]: 'check',
}

const HelpRequestCard = observer(({ 
    request, 
    style,
    dark,
    minimal
} : Props) => {
    const userStore = getStore<IUserStore>(IUserStore);
    const requestStore = getStore<IRequestStore>(IRequestStore);
    const [statusOpen, setStatusOpen] = useState(false);

    const openStatusSelector = () => {
        setStatusOpen(true);
    }

    const closeStatusSelector = () => {
        setStatusOpen(false);
    }

    const closeStatusOrGoToDetails = () => {
        if (statusOpen) {
            closeStatusSelector()
        } else {
            requestStore.setCurrentRequest(request)
            navigateTo(routerNames.helpRequestDetails)
        }
    }

    const header = () => {
        const id = request.displayId;
        const address = request.location.address.split(',').slice(0, 2).join()

        return (
            <View style={styles.headerRow} onTouchStart={closeStatusOrGoToDetails}>
                <Text style={[styles.idText, dark ? styles.darkText : null]}>{id}</Text>
                <View style={styles.locationContainer}>
                    <IconButton
                        style={styles.locationIcon}
                        icon='map-marker' 
                        color={styles.locationIcon.color}
                        size={styles.locationIcon.width} />
                    <Text style={[styles.locationText, dark ? styles.darkText : null]}>{address}</Text>
                </View>
            </View>
        )
    }

    const details = () => {
        const type = request.type.map(t => RequestTypeToLabelMap[t]).join(' · ');
        const notes = request.notes;

        return (
            <View style={styles.detailsRow} onTouchStart={closeStatusOrGoToDetails}>
                <Text numberOfLines={4} style={dark ? styles.darkDetailsText : {}}>
                    <Text style={[styles.typeText, dark ? styles.darkDetailsText : {}]}>{type}: </Text>
                    <Text style={dark ? styles.darkDetailsText : {}}>{notes}</Text>
                </Text>
            </View>
        )
    }

    const status = () => {
        const respondersToAssign = request.respondersNeeded - request.responderIds.length;

        const unAssignedResponders = [];
        const assignedResponders = [];

        for (let i = 0; i < respondersToAssign; i++) {
            unAssignedResponders.push(<IconButton
                style={styles.unAssignedResponderIcon}
                icon='account' 
                color={styles.unAssignedResponderIcon.color}
                size={16} />)
        }

        for (let i = 0; i < request.responderIds.length; i++) {
            const responder = userStore.usersInOrg.get(request.responderIds[i]); 
            assignedResponders.push(<UserIcon user={responder} style={styles.assignedResponderIcon}/>)
        }

        const potentialLabel = RequestStatusToLabelMap[request.status];
        
        const label = typeof potentialLabel == 'string'
            ? potentialLabel
            : potentialLabel(request);

        const statusIcon = (status: RequestStatus, onPress: () => void, style?: StyleProp<ViewStyle>) => {
            const potentialIcon = RequestStatusToIconMap[status];

            return status == RequestStatus.Unassigned
                ? null
                : typeof potentialIcon == 'string' 
                    ? <IconButton
                        onPress={onPress}
                        style={[styles.statusIcon, style]}
                        icon={potentialIcon} 
                        color={styles.statusIcon.color}
                        size={16} />
                    : potentialIcon(onPress, style)
        }

        const statusSelector = () => {
            const firstStatus = request.respondersNeeded > request.responderIds.length
                ? RequestStatus.PartiallyAssigned
                : RequestStatus.Ready;

            const statuses = [firstStatus, RequestStatus.OnTheWay, RequestStatus.OnSite, RequestStatus.Done];

            const currentStatusIdx = statuses.indexOf(request.status);

            const updateStatus = (status: RequestStatus) => async () => {
                if (status != request.status) {
                    switch (status) {
                        case RequestStatus.OnTheWay:
                        case RequestStatus.OnSite:
                        case RequestStatus.Done:
                            await requestStore.setRequestStatus(request.id, status)
                    }
                }

                closeStatusSelector()
            }

            const noMarginIconStyles: StyleProp<ViewStyle> = {
                marginLeft: 0
            }

            const toGoStatusIconStyles: StyleProp<ViewStyle> = [
                noMarginIconStyles,
                { 
                    backgroundColor: styles.toGoStatusSelectorDivider.borderBottomColor,
                    borderColor: styles.toGoStatusSelectorDivider.borderBottomColor
                }
            ]

            return (
                <View style={styles.statusSelector}>
                    { statuses.map((s, i) => {
                        const oldStatusIcon = () => {
                            return statusIcon(s, updateStatus(s), noMarginIconStyles);
                        }

                        const oldIconDivider = () => {
                            return <View style={styles.statusSelectorDivider}/>
                        }

                        const toGoStatusIcon = () => {
                            return statusIcon(s, updateStatus(s), toGoStatusIconStyles)
                        }

                        const toGoIconDivider = () => {
                            return (
                                <View style={[styles.statusSelectorDivider, styles.toGoStatusSelectorDivider]}>
                                    <View style={[{ height: styles.toGoStatusSelectorDivider.borderBottomWidth, overflow: 'hidden'}]}>
                                        <View style={[{ height: styles.toGoStatusSelectorDivider.borderBottomWidth + 1, borderWidth: styles.toGoStatusSelectorDivider.borderBottomWidth, borderColor: styles.toGoStatusSelectorDivider.borderBottomColor, borderStyle: styles.toGoStatusSelectorDivider.borderStyle }]}></View>
                                    </View>
                                </View>
                            )
                        }

                        const resolveStatusIcon = () => {
                            return i == 0
                                ? oldStatusIcon()
                                : currentStatusIdx >= i 
                                    ? oldStatusIcon()
                                    : toGoStatusIcon()
                        }

                        const resolveStatusIconDivider = () => {
                            return currentStatusIdx > i 
                                    ? oldIconDivider()
                                    : toGoIconDivider()
                        }

                        // TODO: add key here at some point
                        return i < (statuses.length - 1)
                            ? <>
                                {resolveStatusIcon()}
                                {resolveStatusIconDivider()}
                            </>
                            : resolveStatusIcon()
                    })}
                </View>
            )
        }

        const hasUnreadMessages = (request.chat && request.chat.messages.length) 
            && (!request.chat.userReceipts[userStore.user.id] 
                || (request.chat.userReceipts[userStore.user.id] < request.chat.lastMessageId));

        const goToChat = () => {
            requestStore.setCurrentRequest(request);
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
                                ? <View style={styles.unreadMessageNotifier}/>
                                : null
                            }
                        </View>
                        <Text style={{ marginRight: styles.messageIcon.marginRight + 2, alignSelf: 'center' }}>·</Text>
                    </>
                    { assignedResponders }
                    { unAssignedResponders }
                    {/* <Button 
                        contentStyle={styles.broadcastContent}
                        style={styles.broadcastButton}
                        labelStyle={styles.broadcastButtonLabel} 
                        mode='text'
                        color={styles.broadcastButtonLabel.color} 
                        icon='bullhorn'>Broadcast</Button> */}
                </View>
                {
                    statusOpen
                        ? statusSelector()
                        : <View style={styles.statusContainer}>
                            <Text style={[styles.statusText, dark ? styles.darkStatusText : null]}>{label}</Text>
                            {statusIcon(request.status, openStatusSelector)}
                        </View>
                }       
            </View>
        )
    }

    return (
        <View style={[styles.container, dark ? styles.darkContainer: null, minimal ? styles.minimalContainer: null, style]}>
            {header()}
            { minimal 
                ? null
                : details()
            }
            {status()}
        </View>
    )
})

export default HelpRequestCard;

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomColor: '#e0e0e0',
        borderBottomWidth: 1
    },
    darkContainer: {
        backgroundColor: '#444144',
    },
    minimalContainer: {
        height: ActiveRequestTabHeight,
        borderBottomWidth: 0,
        justifyContent: 'space-between'
    },
    darkText: {
        color: '#A9A7A9'
    },
    headerRow: {
        height: 22,
        margin: 12,
        marginBottom: 0,
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
        height: 28,
        flexDirection: 'row'
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
    unAssignedResponderIcon: {
        color: '#fff',
        backgroundColor: '#DB0000',
        width: 28,
        height: 28,
        borderRadius: 20,
        margin: 0,
        marginRight: 4,
        borderColor:'#DB0000',
        borderStyle: 'solid',
        borderWidth: 1
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
        color: '#A9A7A9'
    },
    statusIcon: {
        color: '#fff',
        backgroundColor: '#000',
        width: 28,
        height: 28,
        borderRadius: 20,
        margin: 0,
        marginLeft: 4,
        borderColor:'#000',
        borderStyle: 'solid',
        borderWidth: 1
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
        }
    },
    statusSelectorDivider: {
        height: 15,
        width: 28,
        borderBottomColor: '#000',
        borderBottomWidth: 2,
        borderStyle: 'solid',
    },
    toGoStatusSelectorDivider: {
        height: 17,
        justifyContent: 'flex-end',
        borderBottomColor: '#ccc',
        borderBottomWidth: 2,
        borderStyle: 'dotted', 
    }
})