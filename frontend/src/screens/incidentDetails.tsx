import React, { useEffect } from "react";
import { View } from "react-native";
import { Provider } from "react-native-paper";
import { NotificationScreenProp } from "../types";
import { NotificationType } from "../../../common/models";
import { useState } from "react";

type Props = NotificationScreenProp<'IncidentDetails'>;

export default function IncidentDetails({ navigation, route }: Props) {
    const [notification, setNotification] = useState<Props['route']['params']['notification']>(null);

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

                setNotification(params.notification);

                // more realistically, call store method to get incident from api (so we have latest value)
                // and update it's state while this shows loading ui
            }
            
        })();
      }, []);


    return (
        <Provider>
            <View>
                {notification.type == NotificationType.AssignedIncident 
                    ? `Assigned Incident: ${notification.payload.id}`
                    : `Broadcast Incident: ${notification.payload.id}` }
            </View>
        </Provider>
    );
};