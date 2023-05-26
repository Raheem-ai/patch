import React, { useEffect } from "react";
import { Dimensions, Pressable, ScrollView, StyleProp, StyleSheet, TextStyle, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { Colors, ICONS, ScreenProps } from "../types";
import { PatchPermissions, RequestPriority, RequestPriorityToLabelMap, RequestStatus, RequestTypeToLabelMap, RequestDetailsTabs } from "../../../common/models";
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
import { resolveErrorMessage } from "../errors";
import RequestChatChannel from "../components/chats/helpRequestChatChannel";
import MapView, { MapViewProps, Marker, MapMarkerProps, PROVIDER_GOOGLE } from "react-native-maps";
import Tags from "../components/tags";
import Loader from "../components/loader";
import { userOnRequest } from "../../../common/utils/requestUtils";
import * as Linking from 'expo-linking';
import { constants } from "buffer";
import STRINGS from "../../../common/strings";
import PatchButton from "../components/patchButton";
import TestIds from "../test/ids";

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = ScreenProps<'HelpRequestDetails'>;

const dimensions = Dimensions.get('screen');

const HelpRequestDetails = observer(({ navigation, route }: Props) => {
    const [isLoading, setIsLoading] = useState(true);

    const request = () => requestStore().currentRequest;
    // const [requestIsOpen, setRequestIsOpen] = useState(currentRequestIsOpen());

    const [initialTab, setInitialTab] = useState(RequestDetailsTabs.Overview);

    const userIsOnRequest = !isLoading && userOnRequest(userStore().user.id, request());
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
            } else if (params?.initialTab) {
                setInitialTab(params.initialTab)
                setIsLoading(false)
            } else {
                // got here through normal navigation...caller should worry about having up to date copy
                setIsLoading(false)
            }

            await requestStore().ackRequestNotification(request().id)
        })();
    }, []);

    const notesSection = () => {
        const notes = requestStore().currentRequest.notes;
        
        return (
            <View style={styles.notesSection}>
                <Text testID={TestIds.requestDetails.notes} selectable={true}>{notes}</Text>
            </View>
        )
    }

    const prioritySection = () => {
        const priority = requestStore().currentRequest.priority;
        const priorityLabel = RequestPriorityToLabelMap[priority];
        
        const priorityColor = priority == RequestPriority.High
            ? Colors.text.bad
            : priority == RequestPriority.Medium
                ? Colors.text.okay
                : Colors.text.tertiary

        return !!priorityLabel
            ? <View style={styles.priorityOuterSection}>
                    <View style={[styles.priorityInnerSection, { borderColor: priorityColor, borderWidth: 1 }]}>
                        <Text style={{ color: priorityColor }}>{priorityLabel}</Text>
                    </View>
                </View>
            : null
    }

    const detailsSection = () => {
        const address = requestStore().currentRequest.location?.address.split(',').slice(0, 2).join();

        const time = dateToTimeString(new Date(requestStore().currentRequest.createdAt));
        const tags = requestStore().currentRequest.tagHandles.map(item => manageTagsStore().getTag(item.categoryId, item.itemId)?.name).filter(x => !!x);

        return (
            <View style={styles.timeAndPlaceSection}>
                {
                    address
                        ? <Pressable onPress={mapClick}>
                            <View style={styles.timeAndPlaceRow}>
                                <IconButton
                                    style={styles.detailsIcon}
                                    icon={ICONS.mapMarker} 
                                    color={styles.detailsIcon.color}
                                    size={styles.detailsIcon.width} />
                                <Text selectable={true} style={styles.metadataText}>{address}</Text>
                            </View>
                        </Pressable>
                        : null
                }
                { 
                    <View style={styles.timeAndPlaceRow}>
                            <IconButton
                                style={styles.detailsIcon}
                                icon={ICONS.timeCallStarted}
                                color={styles.detailsIcon.color}
                                size={styles.detailsIcon.width} />
                            <Text selectable={true} style={styles.metadataText}>
                                {requestStore().currentRequest.callStartedAt // use user-set start time if it exists, else request creation time
                                    ? requestStore().currentRequest.callStartedAt
                                    : time }
                                {requestStore().currentRequest.callEndedAt // add end time if it's been set
                                    ? ' - ' + requestStore().currentRequest.callEndedAt
                                    : '' }
                            </Text>
                        </View>
                }
                { 
                    requestStore().currentRequest.callerName || requestStore().currentRequest.callerContactInfo
                        ? <View style={styles.timeAndPlaceRow}>
                            <IconButton
                                style={styles.detailsIcon}
                                icon={ICONS.callerContactInfo}
                                color={styles.detailsIcon.color}
                                size={styles.detailsIcon.width} />
                                <Text selectable={true} style={styles.metadataText}>{requestStore().currentRequest.callerName}{requestStore().currentRequest.callerName && requestStore().currentRequest.callerContactInfo 
                                    ? ' ' + STRINGS.visualDelim + ' '
                                    : null}
                                    <Text>{requestStore().currentRequest.callerContactInfo}</Text>
                                </Text>
                        </View>
                        : null
                }
                { 
                    tags.length != 0
                        ? <View style={[styles.timeAndPlaceRow, {marginTop: 8}]}>
                            <IconButton
                                style={[styles.detailsIcon, {marginRight: 8, marginTop: 8}]}
                                icon={ICONS.tag} 
                                color={styles.detailsIcon.color}
                                size={styles.detailsIcon.width} />
                            <Tags 
                                testID={TestIds.requestDetails.tags}
                                centered={false}
                                tags={tags}
                                verticalMargin={4}/>
                        </View>
                        : null
                }
            </View>
        )
    }

    const header = () => {
        const types = requestStore().currentRequest.type.map(typ => RequestTypeToLabelMap[typ])

        /*
        const edit = () => {
            bottomDrawerStore().show(BottomDrawerView.editRequest, true)
        }

        const canEdit = iHaveAllPermissions([PatchPermissions.EditRequestData]) && currentRequestIsOpen();
        */

        return types.length 
            ? <View style={styles.headerContainer}>
                <View style={styles.typeLabelContainer}>
                    <Text selectable={true} style={styles.typeLabel}>{types.join(` ${STRINGS.visualDelim} `)}</Text>
                </View>
            </View>
            : null
    }

     // TODO: check to make sure address is findable and, if not, use lat/long (though that shouldn't happen since address is constructed from a google map )
     // const mapsLink = 'https://www.google.com/maps/dir/?api=1&destination=' + locLat + ',' + locLong;
    const mapClick = () => {
        const mapsLink = requestStore().currentRequest.location && 'https://www.google.com/maps/search/?api=1&query=' + requestStore().currentRequest.location.address;
        Linking.openURL(mapsLink);
    }

    const mapPreview = () => {
        if (!requestStore().currentRequest.location) {
            return null;
        } else {
            const locLat = requestStore().currentRequest.location.latitude;
            const locLong = requestStore().currentRequest.location.longitude;

            const initialRegion =  {
                latitude: locLat,
                longitude: locLong,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }; 

            const mapProps: MapViewProps = {
                provider: PROVIDER_GOOGLE,
                pointerEvents: "none",
                showsUserLocation: true,
                initialRegion,
                style: styles.mapView,
            }

            const markerProps: MapMarkerProps = {
                coordinate: { 
                    latitude: locLat,
                    longitude: locLong,
                }
            }

            return (
                <Pressable onPress={mapClick}>
                    <MapView {...mapProps}>
                        <Marker {...markerProps}/>
                    </MapView>
                </Pressable>
            );
        }
    }

    const statusPicker = () => {
        return (
            <View style={{ 
                height: 85, 
                backgroundColor: Colors.backgrounds.standard,
                marginBottom: 12
            }}>
                <StatusSelector style={{ paddingHorizontal: 20, paddingTop:  14 }}  withLabels large requestId={request().id} />
            </View>
        )
    }

    const toggleRequestButton = () => {
        const currentRequestOpen = currentRequestIsOpen();

        return (
            <View style={styles.toggleRequestContainer}>
                <PatchButton 
                    testID={currentRequestOpen ? TestIds.requestDetails.closeRequest : TestIds.requestDetails.reopenRequest}
                    mode='outlined'
                    uppercase={false}
                    label={STRINGS.REQUESTS.TOGGLE.toggleRequest(currentRequestOpen)}
                    onPress={currentRequestOpen 
                        ? closeRequestOrPrompt() 
                        : reopenRequest()
                    } />
            </View>
        )
    }

    const closeRequest = async () => {
        try {
            await requestStore().closeRequest(requestStore().currentRequest.id);
            // setRequestIsOpen(false);
        } catch (e) {
            alertStore().toastError(resolveErrorMessage(e));
        }
    }

    const closeRequestOrPrompt = () => async () => {
        if (!requestStore().currentRequest.type.length) {
            alertStore().showPrompt({
                title:  STRINGS.REQUESTS.TOGGLE.title,
                message: STRINGS.REQUESTS.TOGGLE.message,
                actions: [
                    {
                        label: STRINGS.REQUESTS.TOGGLE.add,
                        onPress: () => {
                            bottomDrawerStore().show(BottomDrawerView.editRequest, true)
                        },
                    },
                    {   
                        label: STRINGS.REQUESTS.TOGGLE.close,
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
        // setRequestIsOpen(true);
    }

    // TODO: Added this getter because "requestIsOpen" state variable isn't being computed properly.
    // currently still using state variable to trigger re-render.
    function currentRequestIsOpen() {
        return requestStore().currentRequest?.status != RequestStatus.Closed;
    }

    if (isLoading || !request()) {
        return <Loader/>
    }

    const overview = () => {
        const showCloseOpenReqButton = userIsRequestAdmin || (userIsOnRequest && userHasCloseRequestPermission)

        return (
        <>
            <WrappedScrollView 
                testID={TestIds.requestDetails.overview}
                showsVerticalScrollIndicator={false} 
                style={{backgroundColor: (showCloseOpenReqButton 
                    ? Colors.backgrounds.secondary 
                    : Colors.backgrounds.standard)
            }}>
                <View style={styles.detailsContainer}>
                    { header() }
                    { notesSection() }
                    { prioritySection() }
                    { mapPreview() }
                    { detailsSection() }
                </View>
                { showCloseOpenReqButton
                    ? toggleRequestButton()
                    : null 
                }
            </WrappedScrollView>
            <View style={{ 
                position: "relative",
                left: 0, 
                bottom: 0, 
                backgroundColor: styles.detailsContainer.backgroundColor, 
                borderTopColor: Colors.borders.filter, 
                borderTopWidth: 1,
                shadowColor: '#000',
                shadowOpacity: .1,
                shadowOffset: {
                    height: -1,
                    width: 0
                } }}>
                { currentRequestIsOpen()
                    ? statusPicker() 
                    : null 
                }
            </View>
        </>
        )
    }

    const channel = () => {
        return (
            <View testID={TestIds.requestDetails.channel}>
                <RequestChatChannel inTabbedScreen={true}/>
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

                return <View style={{ padding: 20, paddingBottom: 0 }}>
                    <PatchButton 
                        testID={TestIds.requestDetails.notifyPeople}
                        mode='outlined'
                        uppercase={false}
                        label={STRINGS.REQUESTS.NOTIFICATIONS.notifyPeople}
                        onPress={startNotifyFlow} />
                </View>
            }
        }

        const [eventDetailsOpen, setEventDetailsOpen] = useState(false);

        const teamEventDetails = () => {
            if (!isRequestAdmin) {
                return null
            } else {
                const requestMetadata = requestStore().getRequestMetadata(userStore().user.id, request().id);
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

                for (const pos of request().positions) {
                    const posMeta = requestStore().getPositionScopedMetadata(userStore().user.id, request().id, pos.id);
                    
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

                const notifiedLabel = STRINGS.REQUESTS.NOTIFICATIONS.nRespondersNotified(numNotified);

                const newLabel = pendingRequests.length
                    ? STRINGS.REQUESTS.NOTIFICATIONS.nRespondersAsking(pendingRequests.length)
                    : null;

                const positionScopedRow = ({ 
                    userId, 
                    positionName, 
                    rightElem 
                }: { userId: string, positionName: string, rightElem: () => JSX.Element }) => {
                    const user = userStore().users.get(userId);
                    const isInOrg = !!user && userStore().userInOrg(user);
                    const userName = user?.name;

                    const userLabel = userName 
                        ? isInOrg
                            ? userName
                            : STRINGS.REQUESTS.POSITIONS.removedUserName(userName)
                        : STRINGS.REQUESTS.POSITIONS.deletedUserName;

                    return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
                            <View style={{ flexShrink: 1 }}>
                                <Text>
                                    <Text>{`${userLabel} ${STRINGS.visualDelim} `}</Text>
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
                    const user = userStore().users.get(userId);
                    const isInOrg = !!user && userStore().userInOrg(user);
                    const userName = user?.name;

                    const userLabel = userName 
                        ? isInOrg
                            ? userName
                            : STRINGS.REQUESTS.POSITIONS.removedUserName(userName)
                        : STRINGS.REQUESTS.POSITIONS.deletedUserName;
                    
                    const userLabelStyle: StyleProp<TextStyle> = (userName && isInOrg) ? {} : { fontStyle: 'italic' };

                    return (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                            <Text style={userLabelStyle}>{userLabel}</Text>
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
                                await requestStore().denyRequestToJoinRequest(userId, request().id, positionId)
                            } catch (e) {
                                alertStore().toastError(resolveErrorMessage(e));
                            }
                        
                        }

                        const approve = async () => {                        
                            try {
                                await requestStore().approveRequestToJoinRequest(userId, request().id, positionId)
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
                                        icon={ICONS.joinDecline}
                                        style={[styles.notifyButton, { marginLeft: 8, height: 30, width: 54 }]}></IconButton>
                                    <IconButton
                                        color={Colors.primary.alpha}
                                        onPress={approve}
                                        icon={ICONS.joinAccept}
                                        style={[styles.notifyButton, { marginLeft: 8, height: 30, width: 54 }]}></IconButton>
                                </View>
                            </View>
                        )
                    }

                    return (
                        pendingRequests.length + deniedRequests.length > 0
                            ? <View style={{ padding: 20, borderTopColor: Colors.borders.filter, borderTopWidth: 1 }}>
                                <Text style={{ fontWeight: 'bold', paddingBottom: 10}}>{STRINGS.REQUESTS.NOTIFICATIONS.SECTIONS.asked}</Text>
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
                                            rightElem: responseLabel(STRINGS.REQUESTS.NOTIFICATIONS.SECTIONS.denied)
                                        })
                                    })
                                }
                            </View>
                            : null
                    )
                }

                const joinedSection = () => {

                    // TODO: should we change the icon here if the user is no longer in the org?
                    const joinedIcon = () => {
                        return (
                            <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'flex-end' }}>
                                <IconButton
                                    style={styles.icon}
                                    icon={ICONS.joinAccepted}
                                    color={Colors.good}
                                    size={styles.icon.width} />
                            </View>
                        )
                    }

                    return (
                        joinedUsers.length > 0
                        ? <View style={{ padding: 20, borderTopColor: Colors.borders.filter, borderTopWidth: 1 }}>
                            <Text style={{ fontWeight: 'bold', paddingBottom: 10 }}>{STRINGS.REQUESTS.NOTIFICATIONS.SECTIONS.joined}</Text>
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
                        : null
                    )
                }

                const viewedSection = () => {
                    return (
                        viewedUsers.size > 0
                            ? <View style={{ padding: 20, borderTopColor: Colors.borders.filter, borderTopWidth: 1 }}>
                                <Text style={{ fontWeight: 'bold', paddingBottom: 10 }}>{STRINGS.REQUESTS.NOTIFICATIONS.SECTIONS.viewed}</Text>
                                { 
                                    Array.from(viewedUsers.entries()).map(([userId, timestamp]) => requestScopedRow({ userId, timestamp }))
                                }
                            </View>
                            : null
                    )
                }

                const notificationsSection = () => {
                    return (
                        notifiedUsers.size > 0
                            ? <View style={{ padding: 20, borderTopColor: Colors.borders.filter, borderTopWidth: 1 }}>
                                <Text style={{ fontWeight: 'bold', paddingBottom: 10 }}>{STRINGS.REQUESTS.NOTIFICATIONS.SECTIONS.sent}</Text>
                                { 
                                
                                    Array.from(notifiedUsers.entries()).map(([userId, timestamp]) => requestScopedRow({ userId, timestamp }))
                                }
                            </View>
                            : null
                    )
                }

                const toggleTeamDetails = async () => {
                    setEventDetailsOpen(!eventDetailsOpen)
                    
                    if (!eventDetailsOpen) {
                        await requestStore().ackRequestsToJoinNotification(request().id)
                    }
                }

                return pendingRequests.length + deniedRequests.length + Array.from(viewedUsers.entries()).length + joinedUsers.length + Array.from(notifiedUsers.entries()).length > 0
                    ? <View>
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
                                <Text style={{ fontWeight: 'bold', textTransform:'uppercase', }}>{notifiedLabel}</Text>
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
                                icon={!eventDetailsOpen ? ICONS.filterOpen : ICONS.filterClose}/>
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
                    : <View style={{height: 20}}></View>
            }
        }

        // used for case where there are no positions defined and we want to include a button to add them
        const editAction = () => {
            const edit = () => {
                bottomDrawerStore().show(BottomDrawerView.editRequest, true)
            }

            const canEdit = iHaveAllPermissions([PatchPermissions.EditRequestData]) && currentRequestIsOpen();

            return (
                canEdit
                    ? <View>
                        <PatchButton 
                            testID={TestIds.requestDetails.addResponders}
                            mode='contained'
                            uppercase={false}
                            label={STRINGS.REQUESTS.ACTIONS.addResponders}
                            onPress={edit} />
                    </View>
                    : null
            )
        }

        return (
            <WrappedScrollView testID={TestIds.requestDetails.team} style={{ backgroundColor: '#FFFFFF'}} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: Colors.backgrounds.secondary, borderBottomColor: Colors.borders.filter, borderBottomWidth: 1 }}>
                    { notifyAction() }
                    { teamEventDetails() }
                </View>
                {
                    request().positions.length > 0 
                        ? request().positions.map(pos => {
                            return (
                                <PositionDetailsCard key={pos.id} requestId={request().id} positionId={pos.id}/>
                            )
                        })
                        : <View style={{ padding: 20, paddingBottom: 0 }}>
                            <Text style={{lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8}}>{ STRINGS.cap(STRINGS.ELEMENTS.responder(true)) }</Text>
                            <Text style={{lineHeight: 18}}>{STRINGS.REQUESTS.noRespondersDefined}</Text>
                            <View style={{ marginTop: 20 }}>{ editAction() }</View>
                        </View>
                }
            </WrappedScrollView>
        )

    })

    const tabs = []
    const userHasPermissionToSeeChat = iHaveAnyPermissions([PatchPermissions.ChatAdmin, PatchPermissions.SeeRequestChats, PatchPermissions.RequestAdmin])

    tabs.push(
        {
            label: RequestDetailsTabs.Overview,
            view: overview
        }
    );

    if (userIsOnRequest || userHasPermissionToSeeChat) {
        tabs.push(
            {
                label: RequestDetailsTabs.Channel,
                view: channel
            }
        );
    }

    tabs.push(
        {
            label: RequestDetailsTabs.Team,
            view: team
        }
    );

    return (
        <TabbedScreen
            testID={TestIds.requestDetails.screen}
            bodyStyle={{ backgroundColor: Colors.backgrounds.standard }}
            defaultTab={initialTab} 
            tabs={tabs}/>
    );

});

export default HelpRequestDetails;



const styles = StyleSheet.create({
    detailsContainer: {
        padding: 16,
        paddingTop: 30,
        paddingBottom: 0,
        backgroundColor: Colors.backgrounds.standard,
    },
    toggleRequestContainer: { 
        width: '100%',
        padding: 20,
        paddingTop: 24,
        backgroundColor: Colors.backgrounds.secondary,
        borderTopColor: Colors.borders.formFields,
        borderTopWidth: 1

    },
    notesSection: {
        marginBottom: 16
    },
    priorityOuterSection: {
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
        marginBottom: 16
    },
    timeAndPlaceRow: {
        flexDirection: 'row',
        marginVertical: 2
    },
    detailsIcon: { 
        width: 16,
        color: Colors.icons.dark,
        alignSelf: 'flex-start',
        marginRight: 4,
        marginLeft: 0,
        paddingLeft: 0,
    },
    metadataText: {
        fontSize: 14,
        alignSelf: 'center',
        color: Colors.text.secondary,
        marginLeft: 4
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    editIcon: {
        width: 20,
        height: 20,
        color: '#999',
        alignSelf: 'flex-start',
        margin: 0
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
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: Colors.backgrounds.standard
    },
    addPositionsButton: {
        backgroundColor: Colors.primary.alpha,
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 24,
        // margin: 20,
        width: '100%',
        height: 48
    },
    mapView: {
        height: 180,
        marginBottom: 16
    }
})
