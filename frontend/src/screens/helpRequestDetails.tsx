import React, { useEffect } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { Colors, ScreenProps } from "../types";
import { PatchPermissions, RequestPriority, RequestPriorityToLabelMap, RequestStatus, RequestTypeToLabelMap } from "../../../common/models";
import { useState } from "react";
import { alertStore, bottomDrawerStore, BottomDrawerView, manageTagsStore, organizationStore, requestStore, updateStore, userStore } from "../stores/interfaces";
import { observer } from "mobx-react";
import { dateToTimeString } from "../../../common/utils";

import { wrapScrollView } from 'react-native-scroll-into-view'
import { StatusSelector } from "../components/statusSelector";
import { VisualArea } from "../components/helpers/visualArea";
import TabbedScreen from "../components/tabbedScreen";
import PositionDetailsCard from "../components/positionDetailsCard";
import { iHaveAllPermissions, iHaveAnyPermissions } from "../utils";
import { visualDelim } from "../constants";
import { resolveErrorMessage } from "../errors";
import ChatChannel from "../components/chats/chatChannel";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import Tags from "../components/tags";
import Loader from "../components/loader";
import { userOnRequest } from "../../../common/utils/requestUtils";

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = ScreenProps<'HelpRequestDetails'>;

const dimensions = Dimensions.get('screen');

const HelpRequestDetails = observer(({ navigation, route }: Props) => {
    const [isLoading, setIsLoading] = useState(true);

    const request = requestStore().currentRequest;
    const [requestIsOpen, setRequestIsOpen] = useState(currentRequestIsOpen());

    const userIsOnRequest = userOnRequest(userStore().user.id, request);
    const userIsRequestAdmin = iHaveAnyPermissions([PatchPermissions.RequestAdmin]);
    const userHasCloseRequestPermission = iHaveAnyPermissions([PatchPermissions.CloseRequests]);

    useEffect(() => {
        (async () => {
            const params = route.params;

            if (params && params.notification) {
                // Need to mark the request store as loading so the header config knows not to use a stale
                // req displayId while we are transitioning
                await requestStore().loadUntil(async () => {
                    await updateStore().pendingRequestUpdate(params.notification)
                    await requestStore().pushRequest(params.notification.params.requestId)
                })

                setIsLoading(false);
            } else {
                // got here through normal navigation...caller should worry about having up to date copy
                setIsLoading(false)
            }


            await requestStore().ackRequestNotification(request.id)

        })();
    }, []);

    const notesSection = () => {
        const notes = requestStore().currentRequest.notes;
        
        return (
            <View style={styles.notesSection}>
                <Text>{notes}</Text>
            </View>
        )
    }

    const prioritySection = () => {
        const priority = requestStore().currentRequest.priority;
        const priorityLabel = RequestPriorityToLabelMap[priority];
        
        const priorityColor = priority == RequestPriority.High
            ? Colors.bad
            : priority == RequestPriority.Medium
                ? Colors.okay
                : priority == RequestPriority.Low
                    ? '#999799'
                    : null
        
        if (!priorityColor) {
            return null
        }
        
        return (
            <View style={styles.priorityOutterSection}>
                <View style={[styles.priorityInnerSection, { borderColor: priorityColor, borderWidth: 1 }]}>
                    <Text style={{ color: priorityColor }}>{priorityLabel}</Text>
                </View>
            </View>
        )
    }

    const detailsSection = () => {
        const address = requestStore().currentRequest.location?.address.split(',').slice(0, 2).join();

        const time = new Date(requestStore().currentRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const tags = requestStore().currentRequest.tagHandles.map(item => manageTagsStore().getTag(item.categoryId, item.itemId)?.name).filter(x => !!x);

        return (
            <View style={styles.timeAndPlaceSection}>
                {
                    address
                        ? <View style={styles.timeAndPlaceRow}>
                            <IconButton
                                style={styles.detailsIcon}
                                icon='map-marker' 
                                color={styles.detailsIcon.color}
                                size={styles.detailsIcon.width} />
                            <Text style={styles.locationText}>{address}</Text>
                        </View>
                        : null
                }
                <View style={styles.timeAndPlaceRow}>
                    <IconButton
                        style={styles.detailsIcon}
                        icon='clock-outline' 
                        color={styles.detailsIcon.color}
                        size={styles.detailsIcon.width} />
                    <Text style={styles.timeText}>{time.toLocaleString()}</Text>
                </View>
                { requestStore().currentRequest.callStartedAt && requestStore().currentRequest.callEndedAt
                    ? <View style={styles.timeAndPlaceRow}>
                        <IconButton
                            style={styles.detailsIcon}
                            icon='phone-incoming' 
                            color={styles.detailsIcon.color}
                            size={styles.detailsIcon.width} />
                        <Text style={styles.timeText}>{requestStore().currentRequest.callStartedAt + ' - ' +requestStore().currentRequest.callEndedAt}</Text>
                    </View>
                    : null
                }
                { requestStore().currentRequest.callerName || requestStore().currentRequest.callerContactInfo
                    ? <View style={styles.timeAndPlaceRow}>
                        <IconButton
                            style={styles.detailsIcon}
                            icon='account' 
                            color={styles.detailsIcon.color}
                            size={styles.detailsIcon.width} />
                        <View style={styles.contactInfoRow}>
                            <Text style={[styles.timeText, { alignSelf: 'flex-start' }]}>{requestStore().currentRequest.callerName}</Text>
                            <Text style={[styles.timeText, { alignSelf: 'flex-start' }]}>{requestStore().currentRequest.callerContactInfo}</Text>
                        </View>
                    </View>
                    : null
                }
                { tags.length != 0
                    ? <View style={styles.timeAndPlaceRow}>
                        <IconButton
                            style={styles.detailsIcon}
                            icon='tag' 
                            color={styles.detailsIcon.color}
                            size={styles.detailsIcon.width} />
                        <Tags 
                            centered
                            tags={tags}/>
                    </View>
                    : null
                }
            </View>
        )
    }

    const header = () => {
        const tags = requestStore().currentRequest.type.map(typ => RequestTypeToLabelMap[typ])

        const edit = () => {
            bottomDrawerStore().show(BottomDrawerView.editRequest, true)
        }

        return (
            <View style={styles.headerContainer}>
                <View style={styles.typeLabelContainer}>
                    <Text style={styles.typeLabel}>{tags.join(` ${visualDelim} `)}</Text>
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

    const mapPreview = () => {
        if (!requestStore().currentRequest.location) {
            return null;
        }

        const initialRegion =  {
            latitude: requestStore().currentRequest.location.latitude,
            longitude: requestStore().currentRequest.location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        };
        
        return (
            <MapView 
                provider={PROVIDER_GOOGLE} 
                pointerEvents="none"
                showsUserLocation={true}
                initialRegion={initialRegion}
                // zoomEnabled={false}
                // rotateEnabled={false}
                // scrollEnabled={false}
                // zoomTapEnabled={false}
                style={styles.mapView}>
                    <Marker
                        coordinate={{ 
                            latitude: requestStore().currentRequest.location.latitude, 
                            longitude: requestStore().currentRequest.location.longitude
                        }}/>
            </MapView>
        );
    }

    const statusPicker = () => {
        return (
            <View style={{ 
                height: 85, 
                backgroundColor: '#FFFFFF',
                marginBottom: 12
            }}>
                <StatusSelector style={{ paddingHorizontal: 20, paddingTop:  14 }}  withLabels dark large requestId={request.id} />
            </View>
        )
    }

    const toggleRequestButton = () => {
        const currentRequestOpen = currentRequestIsOpen();

        return (
            <View style={{ 
                width: '100%',
                padding: 20,
                paddingTop: currentRequestOpen ? 0 : 20,
                backgroundColor: '#FFFFFF',
            }}>
                <Button
                    uppercase={false}
                    color={currentRequestOpen ? '#fff' : '#76599A'}
                    style={[styles.button, currentRequestOpen ? styles.closeRequestButton : styles.openRequestButton]}
                    onPress={currentRequestOpen ? closeRequestOrPrompt() : reopenRequest()}
                    >
                        {currentRequestOpen ? 'Close this request' : 'Re-open this request'}
                </Button>
            </View>
        )
    }

    const closeRequest = async () => {
        try {
            await requestStore().closeRequest(requestStore().currentRequest.id);
            setRequestIsOpen(false);
        } catch (e) {
            alertStore().toastError(resolveErrorMessage(e));
        }
    }

    const closeRequestOrPrompt = () => async () => {
        if (!requestStore().currentRequest.type.length) {
            alertStore().showPrompt({
                title: 'Hmmm...',
                message: `Are you sure you want to close this request without specifying its type?`,
                actions: [
                    {
                        label: 'Add now',
                        onPress: () => {
                            bottomDrawerStore().show(BottomDrawerView.editRequest, true)
                        },
                    },
                    {   
                        label: 'Close anyway',
                        onPress: async () => {
                            await closeRequest()
                        },
                        confirming: true
                    }
                ]
            })
        } else {
            await closeRequest()
        }
    }

    const reopenRequest = () => async () => {
        await requestStore().reopenRequest(requestStore().currentRequest.id);
        setRequestIsOpen(true);
    }

    // TODO: Added this getter because "requestIsOpen" state variable isn't being computed properly.
    //       currently still using state variable to trigger re-render.
    function currentRequestIsOpen() {
        return requestStore().currentRequest?.status != RequestStatus.Closed;
    }

    if (isLoading || !request) {
        return <Loader/>
    }

    const overview = () => {
        const showCloseOpenReqButton = userIsRequestAdmin || (userIsOnRequest && userHasCloseRequestPermission)

        return (
        <>
            <WrappedScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsContainer}>
                    { header() }
                    { notesSection() }
                    { prioritySection() }
                    { mapPreview() }
                    { detailsSection() }
                </View>
                {/* { teamSection() } */}
            </WrappedScrollView>
            <View style={{ position: "relative", left: 0, bottom: 0, backgroundColor: styles.detailsContainer.backgroundColor, borderTopColor: '#E0E0E0', borderTopWidth: 1 }}>
                { currentRequestIsOpen()
                    ? statusPicker() 
                    : null 
                }
                { showCloseOpenReqButton
                    ? toggleRequestButton()
                    : null 
                }
            </View>
        </>
        )
    }

    const channel = () => {
        return (
            <View>
                <ChatChannel screenView={false}/>
            </View>
        )
    }

    const team = observer(() => {
        const isRequestAdmin = iHaveAllPermissions([PatchPermissions.RequestAdmin]);

        const notifyAction = () => {
            if (!isRequestAdmin || !currentRequestIsOpen()) {
                return null
            } else {
                const startNotifyFlow = () => {
                    bottomDrawerStore().show(BottomDrawerView.assignResponders, true)
                }

                return <View style={{ padding: 20 }}>
                    <Button
                        uppercase={false} 
                        color={Colors.primary.alpha}
                        mode={'outlined'}
                        onPress={startNotifyFlow}
                        style={[styles.notifyButton]}>{'Notify people'}</Button>
                </View>
            }
        }

        const [eventDetailsOpen, setEventDetailsOpen] = useState(false);

        const teamEventDetails = () => {
            if (!isRequestAdmin) {
                return null
            } else {
                const requestMetadata = requestStore().getRequestMetadata(userStore().user.id, request.id);
                const numNotified = requestMetadata.notificationsSentTo.size;

                const notifiedUsers = new Map(requestMetadata.notificationsSentTo);
                const viewedUsers = new Map(requestMetadata.notificationsViewedBy);

                const pendingRequests: {
                    userId: string, 
                    positionName: string, 
                    positionId: string
                }[] = [];

                const deniedRequests: {
                    userId: string, 
                    positionName: string
                }[] = []

                const joinedUsers: {
                    userId: string, 
                    positionName: string
                }[] = []
                
                let numUnseenPositionRequests = 0;

                for (const pos of request.positions) {
                    const posMeta = requestStore().getPositionScopedMetadata(userStore().user.id, request.id, pos.id);
                    
                    posMeta.unseenJoinRequests.forEach(requesterId => {
                        const haveNotSeenThisSession = requestStore().joinRequestIsUnseen(requesterId, request.id, pos.id);
                    
                        // let us mark seen events during a session even if an api call fails
                        if (haveNotSeenThisSession) {
                            numUnseenPositionRequests += 1
                        }
                    })
                    
                    posMeta.pendingJoinRequests.forEach(userId => {
                        pendingRequests.push({
                            userId, 
                            positionName: organizationStore().roles.get(pos.role)?.name,
                            positionId: pos.id
                        })

                        // notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })

                    posMeta.deniedJoinRequests.forEach(userId => {
                        deniedRequests.push({
                            userId, 
                            positionName: organizationStore().roles.get(pos.role)?.name
                        })

                        // notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })

                    Array.from(posMeta.joinedUsers.values()).forEach(userId => {
                        joinedUsers.push({
                            userId,
                            positionName: organizationStore().roles.get(pos.role)?.name
                        })

                        // notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })
                }

                viewedUsers.forEach((_, userId) => {
                    // notifiedUsers.delete(userId)
                })

                const notifiedLabel = `${numNotified} PEOPLE NOTIFIED`;

                const newLabel = numUnseenPositionRequests
                    ? ` ${visualDelim} ${numUnseenPositionRequests} new requests`
                    : null;

                const positionScopedRow = ({ 
                    userId, 
                    positionName, 
                    rightElem 
                }: { userId: string, positionName: string, rightElem: () => JSX.Element }) => {
                    const userName = userStore().users.get(userId)?.name;

                    return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                            <View style={{ flexShrink: 1 }}>
                                <Text>
                                    <Text>{`${userName} - `}</Text>
                                    <Text style={{ fontWeight: 'bold' }}>{positionName}</Text>
                                </Text>
                            </View>
                            { rightElem() }
                        </View>
                    )
                }

                const requestScopedRow = ({ 
                    userId, 
                    timestamp
                }: { userId: string, timestamp: Date }) => {
                    const userName = userStore().users.get(userId)?.name;

                    return (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                            <Text>{`${userName}`}</Text>
                            <Text>{dateToTimeString(timestamp)}</Text>
                        </View>
                    )
                }

                const requestSection = () => {

                    const responseLabel = (text: string) => () => {
                        return <View style={{ flexGrow: 1 }}>
                            <Text style={{ textAlign: 'right' }}>{text}</Text>
                        </View>
                    }

                    const requestToJoinActions = (userId: string, positionId: string) => () => {
                        if(!currentRequestIsOpen()) {
                            return responseLabel('Unanswered')()
                        }

                        const deny = async () => {
                            try {
                                await requestStore().denyRequestToJoinRequest(userId, request.id, positionId)
                            } catch (e) {
                                alertStore().toastError(resolveErrorMessage(e));
                            }
                        
                        }

                        const approve = async () => {                        
                            try {
                                await requestStore().approveRequestToJoinRequest(userId, request.id, positionId)
                            } catch (e) {
                                alertStore().toastError(resolveErrorMessage(e));
                            }
                        }

                        return (

                            <View style={{ justifyContent: 'center', alignItems: 'flex-end',  flexGrow: 1 }}>
                                <View style={{ flexDirection: 'row'}}>
                                    <IconButton
                                        color={Colors.primary.alpha}
                                        onPress={deny}
                                        icon='close'
                                        style={[styles.notifyButton, { marginLeft: 8, height: 30, width: 54 }]}></IconButton>
                                    <IconButton
                                        color={Colors.primary.alpha}
                                        onPress={approve}
                                        icon='check'
                                        style={[styles.notifyButton, { marginLeft: 8, height: 30, width: 54 }]}></IconButton>
                                </View>
                            </View>
                        )
                    }

                    return (
                        <View style={{ padding: 20, borderBottomColor: '#E0E0E0', borderBottomWidth: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>{'Asked to join'}</Text>
                            { 
                                pendingRequests.map(({ userId, positionName, positionId }) => {
                                    return positionScopedRow({
                                        userId, 
                                        positionName,
                                        rightElem: requestToJoinActions(userId, positionId)
                                    })
                                })
                            }
                            { 
                                deniedRequests.map(({ userId, positionName }) => {
                                    return positionScopedRow({
                                        userId, 
                                        positionName,
                                        rightElem: responseLabel('Denied')
                                    })
                                })
                            }
                        </View>
                    )
                }

                const joinedSection = () => {

                    const joinedIcon = () => {
                        return (
                            <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <IconButton
                                    style={styles.icon}
                                    icon={'check-circle'}
                                    color={Colors.good}
                                    size={styles.icon.width} />
                            </View>
                        )
                    }

                    return (
                        <View style={{ padding: 20 }}>
                            <Text style={{ fontWeight: 'bold' }}>{'Joined'}</Text>
                            { 
                                joinedUsers.map(({ userId, positionName }) => {
                                    return positionScopedRow({
                                        userId, 
                                        positionName,
                                        rightElem: joinedIcon
                                    })
                                })
                            }
                        </View>
                    )
                }

                const viewedSection = () => {
                    return (
                        <View style={{ paddingHorizontal: 20 }}>
                            <Text style={{ fontWeight: 'bold' }}>{'Viewed request'}</Text>
                            { 
                                Array.from(viewedUsers.entries()).map(([userId, timestamp]) => requestScopedRow({ userId, timestamp }))
                            }
                        </View>
                    )
                }

                const notificationsSection = () => {
                    return (
                        <View style={{ padding: 20 }}>
                            <Text style={{ fontWeight: 'bold' }}>{'Notification sent'}</Text>
                            { 
                                Array.from(notifiedUsers.entries()).map(([userId, timestamp]) => requestScopedRow({ userId, timestamp }))
                            }
                        </View>
                    )
                }

                const toggleTeamDetails = async () => {
                    setEventDetailsOpen(!eventDetailsOpen)
                    
                    if (!eventDetailsOpen) {
                        await requestStore().ackRequestsToJoinNotification(request.id)
                    }
                }

                return (
                    <View>
                        <Pressable 
                            style={{ 
                                padding: 20, 
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }} 
                            onPress={toggleTeamDetails}
                        >
                            <View>
                                <Text style={{ fontWeight: 'bold' }}>{notifiedLabel}</Text>
                            </View>
                            { newLabel
                                ? <View style={{ flex: 1 }}>
                                    <Text style={{ 
                                        color: Colors.primary.alpha, 
                                        fontSize: 14
                                    }}>{newLabel}</Text>
                                </View>
                                : null
                            }
                            <IconButton 
                                style={styles.largeIcon}
                                size={styles.largeIcon.height}
                                color={'#999'}
                                icon={!eventDetailsOpen ? 'chevron-down' : 'chevron-up'}/>
                        </Pressable>
                        {
                            eventDetailsOpen
                                ? <View>
                                    { requestSection() }
                                    { joinedSection() }
                                    { viewedSection() }
                                    { notificationsSection() }
                                </View>
                                : null
                        }
                    </View>
                )
            }
        }

        return (
            <WrappedScrollView style={{ backgroundColor: '#FFFFFF'}} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: '#F6F4F6', borderBottomColor: '#E0E0E0', borderBottomWidth: 1 }}>
                    { notifyAction() }
                    { teamEventDetails() }
                </View>
                {
                    request.positions.map(pos => {
                        return (
                            <PositionDetailsCard key={pos.id} requestId={request.id} pos={pos}/>
                        )
                    })
                }
            </WrappedScrollView>
        )
    })

    const tabs = []
    const userHasPermissionToSeeChat = iHaveAnyPermissions([PatchPermissions.ChatAdmin, PatchPermissions.SeeRequestChats, PatchPermissions.RequestAdmin])

    tabs.push(
        {
            label: Tabs.Overview,
            view: overview
        }
    );

    if (userIsOnRequest || userHasPermissionToSeeChat) {
        tabs.push(
            {
                label: Tabs.Channel,
                view: channel
            }
        );
    }

    tabs.push(
        {
            label: Tabs.Team,
            view: team
        }
    );

    return (
        <VisualArea>
            <TabbedScreen 
                bodyStyle={{ backgroundColor: '#ffffff' }}
                defaultTab={Tabs.Overview} 
                tabs={tabs}/>
        </VisualArea>
    );
});

export default HelpRequestDetails;

enum Tabs {
    Overview = 'OVERVIEW', 
    Channel = 'CHANNEL',
    Team = 'TEAM'
}

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
    priorityOutterSection: {
        marginBottom: 16,
        // makes the inner section hug the text vs trying to dill the space of its container
        flexDirection: 'row' 
    },
    priorityInnerSection: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    timeAndPlaceSection: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeAndPlaceRow: {
        flexDirection: 'row',
        marginVertical: 5
    },
    contactInfoRow: {
        flexDirection: 'column',
    },
    detailsIcon: { 
        width: 14,
        color: '#666',
        alignSelf: 'center',
        marginRight: 5
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
        height: 20,
        color: '#333',
        alignSelf: 'center',
        margin: 0
    },
    addResponderIcon: {
        width: 20,
        height: 20,
        color: '#999',
        alignSelf: 'center',
        margin: 0
    },
    responderRowActionIcon: {
        width: 20,
        height: 20,
        color: '#fff',
        backgroundColor: '#999',
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
    },
    notifyButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
        backgroundColor: '#fff',
        borderRadius: 32,
        height: 40,
    },
    icon: {
        width: 20,
        height: 20,
        margin: 0
    },
    largeIcon: {
        width: 30,
        height: 30,
        margin: 0
    },
    closeRequestButton: {
        backgroundColor: '#76599A',
    },
    openRequestButton: {
        borderColor: '#76599A',
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: '#ffffff',
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 24,
        // margin: 20,
        width: '100%',
        height: 44
    },
    mapView: {
        height: 120
    }
})