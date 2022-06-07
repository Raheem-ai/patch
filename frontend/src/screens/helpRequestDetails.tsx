import React, { useEffect, useRef } from "react";
import { Dimensions, GestureResponderEvent, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { Colors, routerNames, ScreenProps } from "../types";
import { HelpRequestAssignment, NotificationType, PatchPermissions, RequestStatus, RequestTypeToLabelMap } from "../../../common/models";
import { useState } from "react";
import { alertStore, bottomDrawerStore, BottomDrawerView, dispatchStore, organizationStore, requestStore, userStore } from "../stores/interfaces";
import { observer } from "mobx-react";
import ResponderRow from "../components/responderRow";
import { dateToTimeString, timestampToTimeString } from "../../../common/utils";

import { useScrollIntoView, wrapScrollView } from 'react-native-scroll-into-view'
import { StatusSelector } from "../components/statusSelector";
import { navigateTo } from "../navigation";
import { VisualArea } from "../components/helpers/visualArea";
import TabbedScreen from "../components/tabbedScreen";
import PositionDetailsCard from "../components/positionDetailsCard";
import { iHaveAllPermissions, iHaveAnyPermissions } from "../utils";
import { visualDelim } from "../constants";
import { event } from "react-native-reanimated";
import { resolveErrorMessage } from "../errors";

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = ScreenProps<'HelpRequestDetails'>;

const dimensions = Dimensions.get('screen');

const HelpRequestDetails = observer(({ navigation, route }: Props) => {
    const [notification, setNotification] = useState<Props['route']['params']['notification']>(null);
    const [isLoading, setIsLoading] = useState(true);

    const request = requestStore().currentRequest;
    const [requestIsOpen, setRequestIsOpen] = useState(currentRequestIsOpen());

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
                await requestStore().pushRequest(params.notification.payload.id);
                setNotification(params.notification);
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

    const timeAndPlace = () => {
        const address = requestStore().currentRequest.location.address.split(',').slice(0, 2).join();

        const time = new Date(requestStore().currentRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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

    const chatPreview = () => {

        const lastChatMessage = requestStore().currentRequest.chat?.messages[requestStore().currentRequest.chat.messages.length - 1];

        const chatMessageText = !!lastChatMessage
            ? lastChatMessage.message
            : '';

        const lastMessageAuthor = !!lastChatMessage
            ? userStore().users.get(lastChatMessage.userId)?.name
            : ''

        const lastMessageTime = !!lastChatMessage
            ? timestampToTimeString(lastChatMessage.timestamp)
            : ''

        const hasUnreadMessages = (requestStore().currentRequest.chat && requestStore().currentRequest.chat.messages.length) 
            && (!requestStore().currentRequest.chat.userReceipts[userStore().user.id] 
                || (requestStore().currentRequest.chat.userReceipts[userStore().user.id] < requestStore().currentRequest.chat.lastMessageId));

        const openChat = () => {
            bottomDrawerStore().show(BottomDrawerView.requestChat, true);
        }

        return (
            <Pressable style={styles.chatContainer} onPress={openChat}>

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
            </Pressable>
        )
    }

    // const teamSection = () => {
    //     const responderIds = request?.assignedResponderIds || [];
    //     const canJoin = userStore().isResponder && !request.assignedResponderIds.includes(userStore().user.id)
    //     const canLeave = userStore().isResponder && request.assignedResponderIds.includes(userStore().user.id)

    //     const addResponders = () => {
    //         bottomDrawerStore().show(BottomDrawerView.assignResponders, true);
    //     }

    //     // TODO: this should be a reaction on activeRequest changing between
    //     // existing/ not existing

    //     const joinRequest = async () => {
    //         await requestStore().joinRequest(request.id);
    //     }

    //     const leaveRequest = async () => {
    //         await requestStore().leaveRequest(request.id);
    //     }

    //     const removeResponder = (responderId: string) => () => {
    //         requestStore().removeUserFromRequest(responderId, request.id)
    //     }

    //     const teamHeader = () => {
    //         return (
    //             <View style={styles.teamHeader}>
    //                 <View style={styles.teamLabelContainer}>
    //                     <IconButton
    //                         style={styles.teamIcon}
    //                         icon='account-multiple'
    //                         color={styles.teamIcon.color}
    //                         size={styles.teamIcon.width} />
    //                     <Text style={styles.teamLabel}>TEAM</Text>
    //                 </View>
    //                 <View>
    //                     { userStore().isDispatcher
    //                         ? <IconButton 
    //                             onPress={addResponders}
    //                             style={styles.addResponderIcon}
    //                             icon='account-plus'
    //                             color={styles.addResponderIcon.color}
    //                             size={styles.addResponderIcon.width} />
    //                         : canJoin
    //                             ? <View style={styles.teamLabelContainer}>
    //                                 <IconButton 
    //                                     onPress={joinRequest}
    //                                     style={styles.addResponderIcon}
    //                                     icon='account-check'
    //                                     color={styles.addResponderIcon.color}
    //                                     size={styles.addResponderIcon.width} />
    //                                 <Text style={{ color: styles.addResponderIcon.color, alignSelf: 'center', fontWeight: 'bold', marginLeft: 4 }}>JOIN</Text>    
    //                             </View>
    //                             : canLeave
    //                                 ? <View style={styles.teamLabelContainer}>
    //                                     <IconButton 
    //                                         onPress={leaveRequest}
    //                                         style={styles.addResponderIcon}
    //                                         icon='account-minus'
    //                                         color={styles.addResponderIcon.color}
    //                                         size={styles.addResponderIcon.width} />
    //                                     <Text style={{ color: styles.addResponderIcon.color, alignSelf: 'center', fontWeight: 'bold', marginLeft: 4 }}>LEAVE</Text>    
    //                                 </View>
    //                                 : null
    //                     }
    //                 </View>
    //             </View>
    //         )
    //     }

    //     const responders = () => {
    //         if (!responderIds.length) {
    //             return null;
    //         }

    //         return (
    //             <View style={styles.respondersContainer}>
    //                 {
    //                     responderIds.map((id) => {
    //                         const responder = userStore().users.get(id);

    //                         const goToResponder = () => {
    //                             const org = responder.organizations[userStore().currentOrgId];
    //                             if (org) {
    //                                 userStore().pushCurrentUser(responder);
    //                                 navigateTo(routerNames.userDetails);
    //                             }
    //                         }
                            
    //                         return (
    //                             <View style={{ flexDirection: 'row', marginBottom: 12 }}>
    //                                 <ResponderRow onPress={goToResponder} style={{ flex: 1, marginBottom: 0 }} key={id} responder={responder} orgId={userStore().currentOrgId}/>
    //                                 {
    //                                     userStore().isDispatcher
    //                                         ? <IconButton
    //                                             onPress={removeResponder(id)}
    //                                             style={styles.responderRowActionIcon}    
    //                                             icon='close' 
    //                                             color={styles.responderRowActionIcon.color}
    //                                             size={styles.responderRowActionIcon.width} />
    //                                         : null
    //                                 }
    //                             </View>
    //                         )
    //                     })
    //                 }
    //             </View>
    //         )   
    //     }

    //     const assignments = () => {
    //         if (!request?.assignments?.length) {
    //             return null
    //         }

    //         const Assignment = ({assignment, style}: { assignment: HelpRequestAssignment, style?: StyleProp<ViewStyle> }) => {
    //             const [isOpen, setIsOpen] = useState(false);
    //             const numResponders = assignment.responderIds.length;
    //             const me = useRef<View>();
    //             const scrollIntoView = useScrollIntoView();

    //             const toggleOpen = () => {
    //                 setIsOpen(!isOpen);

    //                 // runs before the state updates
    //                 if (!isOpen) {
    //                     setTimeout(() => {
    //                         scrollIntoView(me.current)
    //                     })
    //                 }
    //             }

    //             // should be for each sorting each responderId into pending, assigned, declined
    //             const assignedResponderIds = [];
    //             const pendingResponderIds = [];
    //             const declinedResponderIds = [];

    //             assignment.responderIds.forEach(responderId => {
    //                 const accepted = request.assignedResponderIds.includes(responderId);
    //                 const declined = request.declinedResponderIds.includes(responderId);

    //                 if (accepted) {
    //                     assignedResponderIds.push(responderId)
    //                 } else if (declined) {
    //                     declinedResponderIds.push(responderId)
    //                 } else {
    //                     pendingResponderIds.push(responderId)
    //                 }
    //             })

    //             const sendReminders = async (event: GestureResponderEvent) => {
    //                 event.stopPropagation();

    //                 await dispatchStore().assignRequest(request.id, pendingResponderIds);
    //                 setIsOpen(false)
    //             }

    //             return (
    //                 <View ref={me} style={[{ backgroundColor: '#E5E3E5' , borderRadius: 4, padding: 16, flex: 1 }, style]}>
    //                     <Pressable style={styles.assignmentHeader} onPress={toggleOpen}>
    //                         <Text>
    //                             <Text style={styles.assignmentHeaderText}>{`${numResponders} ${numResponders > 1 ? 'people' : 'person'} notified`}</Text>
    //                             <Text style={styles.assignmentHeaderSubText}>{` · ${timestampToTimeString(assignment.timestamp)}`}</Text>
    //                         </Text>
    //                         <IconButton
    //                             style={styles.assignmentSelectIcon}
    //                             icon={isOpen ? 'chevron-up' : 'chevron-down'}
    //                             color={styles.assignmentSelectIcon.color}
    //                             size={styles.assignmentSelectIcon.width}/>
    //                     </Pressable>
    //                     { isOpen
    //                         ? <View>
    //                             {
    //                                 assignedResponderIds.map((id) => {
    //                                     const user = userStore().users.get(id);

    //                                     return (
    //                                         <View style={styles.assignmentRow}>
    //                                             <Text style={styles.assignmentRowText}>{user.name}</Text>
    //                                             <IconButton
    //                                                 style={styles.assignmentAcceptedIcon}
    //                                                 icon={'check'}
    //                                                 color={styles.assignmentAcceptedIcon.color}
    //                                                 size={styles.assignmentAcceptedIcon.width}/>
    //                                         </View>
    //                                     )
    //                                 })
    //                             }
    //                             {
    //                                 declinedResponderIds.map((id) => {
    //                                     const user = userStore().users.get(id);

    //                                     return (
    //                                         <View style={styles.assignmentRow}>
    //                                             <Text style={styles.assignmentRowText}>{user.name}</Text>
    //                                             <IconButton
    //                                                 style={styles.assignmentDeclinedIcon}
    //                                                 icon={'close'}
    //                                                 color={styles.assignmentDeclinedIcon.color}
    //                                                 size={styles.assignmentDeclinedIcon.width}/>
    //                                         </View>
    //                                     )
    //                                 })    
    //                             }
    //                             {
    //                                 pendingResponderIds.map((id) => {
    //                                     const user = userStore().users.get(id);

    //                                     return (
    //                                         <View style={styles.assignmentRow}>
    //                                             <Text style={styles.assignmentRowText}>{user.name}</Text>
    //                                             <IconButton
    //                                                 style={styles.assignmentPendingIcon}
    //                                                 icon={'clock-outline'}
    //                                                 color={styles.assignmentPendingIcon.color}
    //                                                 size={styles.assignmentPendingIcon.width}/>
    //                                         </View>
    //                                     )
    //                                 })
    //                             }
    //                             {
    //                                 pendingResponderIds.length
    //                                     ? <View style={{ flexDirection: 'row'}}>
    //                                         <Text style={styles.assignmentReminderButton} onPress={sendReminders}>{`SEND ${pendingResponderIds.length} REMINDER${pendingResponderIds.length > 1 ? 'S' : ''}`}</Text>
    //                                     </View>
    //                                     : null
    //                             }
    //                         </View>
    //                         : null
    //                     }
    //                 </View>
    //             )
    //         }

    //         return (
    //             <View>
    //                 {
    //                     request.assignments.map((assignment, i) => {
    //                         return (
    //                             <Assignment 
    //                                 key={i} 
    //                                 assignment={assignment}
    //                                 style={[i > 0 ? { marginTop: 16 } : null]}/>
    //                         )
    //                     })
    //                 }
    //             </View>
    //         )
    //     }

    //     return (
    //         <View style={styles.teamSection}>
    //             { teamHeader() }
    //             { responders() }
    //             { assignments() }
    //             { userStore().isDispatcher
    //                 ? <Button 
    //                     uppercase={false}
    //                     onPress={addResponders}
    //                     color={styles.addResponderButton.color}
    //                     icon='account-plus' 
    //                     style={styles.addResponderButton}>Add responders</Button>
    //                 : null
    //             } 
    //             { canJoin
    //                 ? <Button 
    //                     uppercase={false}
    //                     onPress={joinRequest}
    //                     color={styles.addResponderButton.color}
    //                     icon='account-check' 
    //                     style={styles.addResponderButton}>Join request</Button>
    //                 : null
    //             }
    //             { canLeave
    //                 ? <Button 
    //                     uppercase={false}
    //                     onPress={leaveRequest}
    //                     color={styles.addResponderButton.color}
    //                     icon='account-minus' 
    //                     style={styles.addResponderButton}>Leave request</Button>
    //                 : null
    //             }
    //         </View>
    //     )
    // }

    const statusPicker = () => {
        if (!currentRequestIsOpen()) {
            return null;
        }

        return (
            <View style={{ 
                height: 85, 
                backgroundColor: '#FFFFFF'
            }}>
                <StatusSelector style={{ paddingHorizontal: 20, paddingTop:  14 }}  withLabels dark large request={request} requestStore={requestStore()} />
            </View>
        )
    }

    const closeRequestButton = () => {
        const userOnRequest = requestStore().currentRequest.positions.some(pos => pos.joinedUsers.includes(userStore().user.id));
        const userIsRequestAdmin = iHaveAnyPermissions([PatchPermissions.RequestAdmin]);
        const userHasCloseRequestPermission = iHaveAnyPermissions([PatchPermissions.CloseRequests]);
        if (userIsRequestAdmin || (userOnRequest && userHasCloseRequestPermission)) {
            const currentRequestOpen = currentRequestIsOpen();

            return (
                <View style={{ 
                    height: 65, 
                    backgroundColor: '#FFFFFF',
                    marginTop: 12
                }}>
                    <Button
                        uppercase={false}
                        color={currentRequestOpen ? '#fff' : '#76599A'}
                        style={[styles.button, currentRequestOpen ? styles.closeRequestButton : styles.openRequestButton]}
                        onPress={currentRequestOpen ? closeRequest() : resetRequestStatus()}
                        >
                            {currentRequestOpen ? 'Close this request' : 'Re-open this request'}
                    </Button>
                </View>
            )
        }

        return null;
    }

    const closeRequest = () => async () => {
        await requestStore().setRequestStatus(requestStore().currentRequest.id, RequestStatus.Closed);
        setRequestIsOpen(false);
    }

    const resetRequestStatus = () => async () => {
        await requestStore().resetRequestStatus(requestStore().currentRequest.id);
        setRequestIsOpen(true);
    }

    // TODO: Added this getter because "requestIsOpen" state variable isn't being computed properly.
    //       currently still using state variable to trigger re-render.
    function currentRequestIsOpen() {
        return requestStore().currentRequest?.status != RequestStatus.Closed;
    }

    if (isLoading || !request) {
        return null
    }

    const overview = () => {
        return (
            <WrappedScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsContainer}>
                    { header() }
                    { notesSection() }
                    { timeAndPlace() }
                    { chatPreview() }
                </View>
                { statusPicker() }
                { closeRequestButton() }
                {/* { teamSection() } */}
            </WrappedScrollView> 
        )
    }

    const team = observer(() => {
        const isRequestAdmin = iHaveAllPermissions([PatchPermissions.RequestAdmin]);

        const notifyAction = () => {
            if (!isRequestAdmin) {
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
                const requestMetadata = requestStore().requestMetadata.get(request.id);
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
                    const posMeta = requestStore().getPositionMetadata(request.id, pos.id);
                    
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

                        notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })

                    posMeta.deniedJoinRequests.forEach(userId => {
                        deniedRequests.push({
                            userId, 
                            positionName: organizationStore().roles.get(pos.role)?.name
                        })

                        notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })

                    Array.from(posMeta.joinedUsers.values()).forEach(userId => {
                        joinedUsers.push({
                            userId,
                            positionName: organizationStore().roles.get(pos.role)?.name
                        })

                        notifiedUsers.delete(userId);
                        viewedUsers.delete(userId);
                    })
                }

                viewedUsers.forEach((_, userId) => {
                    notifiedUsers.delete(userId)
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

                    const deniedLabel = () => {
                        return <View style={{ flexGrow: 1 }}>
                            <Text style={{ textAlign: 'right' }}>{'Denied'}</Text>
                        </View>
                    }

                    const requestToJoinActions = (userId: string, positionId: string) => () => {
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
                                        rightElem: deniedLabel
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

    return (
        <VisualArea>
            <TabbedScreen 
                bodyStyle={{ backgroundColor: '#ffffff' }}
                defaultTab={Tabs.Overview} 
                tabs={[
                    {
                        label: Tabs.Overview,
                        view: overview
                    },
                    {
                        label: Tabs.Team,
                        view: team
                    }
                ]}/>
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
        marginVertical: 24,
        width: 328,
        height: 44
    }
})