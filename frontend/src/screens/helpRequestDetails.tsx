import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Provider, Text } from "react-native-paper";
import { ScreenProps } from "../types";
import { NotificationType, RequestTypeToLabelMap } from "../../../common/models";
import { useState } from "react";
import { IRequestStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import Tags from "../components/tags";

type Props = ScreenProps<'HelpRequestDetails'>;

const HelpRequestDetails = observer(({ navigation, route }: Props) => {
    const requestStore = getStore<IRequestStore>(IRequestStore);

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
                await requestStore.getRequest(params.notification.payload.id);
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
            : requestStore.currentRequest.location.address;

        const time = isLoading
            ? ''
            : new Date(requestStore.currentRequest.createdAt)

        return (
            <View style={styles.timeAndPlaceSection}>
                <View>
                    <IconButton
                        style={styles.locationIcon}
                        icon='map-marker' 
                        color={styles.locationIcon.color}
                        size={styles.locationIcon.width} />
                    <Text style={styles.locationText}>{address}</Text>
                </View>

                <View>
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

    const typeTags = () => {
        const tags = isLoading
            ? []
            : requestStore.currentRequest.type.map(typ => RequestTypeToLabelMap[typ])

        return <View>
            <Tags tags={tags} verticalMargin={12}/>
        </View>
    }

    const chatPreview = () => {
        return (
            <Text>Chat</Text>
        )
    }

    const teamSection = () => {

    }

    return (
        <View style={styles.container}>
            { notesSection() }
            { timeAndPlace() }
            { typeTags() }
            { chatPreview() }
            { teamSection() }
        </View>
    );
});

export default HelpRequestDetails;

const styles = StyleSheet.create({
    container: {
        padding: 16
    },
    notesSection: {
        padding: 12,
        borderRadius: 4,
        borderColor: 'rgba(0,0,0, .1)',
        borderWidth: 1,
        borderStyle: 'solid',
        marginBottom: 16
    },
    timeAndPlaceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
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
    timeIcon: { 
        width: 12,
        color: '#999',
        alignSelf: 'center',
        margin: 0
    },
    timeText: {
        fontSize: 12,
        alignSelf: 'center'
    },
})