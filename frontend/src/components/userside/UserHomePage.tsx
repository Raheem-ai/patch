import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Button, Menu, Provider } from "react-native-paper";
import { getStore } from "../../stores/meta";
import { IDispatchStore, ILocationStore, INotificationStore, IUserStore } from "../../stores/interfaces";
import { routerNames, ScreenProps } from "../../types";
import * as Location from 'expo-location';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationType } from "../../../../common/models";
import { navigateTo } from "../../navigation";

type Props = ScreenProps<'UserHomePage'>;

export default function UserHomePage({ navigation, route }: Props) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

    const userStore = getStore<IUserStore>(IUserStore);
    const locationStore = getStore<ILocationStore>(ILocationStore);
    const notificationStore = getStore<INotificationStore>(INotificationStore);
    const dispatchStore = getStore<IDispatchStore>(IDispatchStore);

    useEffect(() => {
        (async () => {

            // const fgHandle = locationStore.addForegroundCallback((loc) => {
            //     console.log('FOREGROUND: ', `${loc.coords.latitude}, ${loc.coords.longitude}`)
            // })

            const notifSubs = [
                // handle getting notifications of these type in the ui (ie fetch latest data for list)
                notificationStore.onNotification(NotificationType.AssignedIncident, () => {

                }),
                notificationStore.onNotification(NotificationType.BroadCastedIncident, () => {

                })
            ];

            const notifResSubs = [
                // handle users response to these notification type (ie change ui to indicate we're currently en route to an incident)
                notificationStore.onNotificationResponse(NotificationType.AssignedIncident, () => {

                }),
                notificationStore.onNotificationResponse(NotificationType.BroadCastedIncident, () => {

                })
            ];

            return () => {
                for (const s of notifSubs) {
                    notificationStore.offNotification(s)
                }

                for (const s of notifResSubs) {
                    notificationStore.offNotificationResponse(s)
                }
            }
        })();
      }, []);


    const signout = async () => {
        await userStore.signOut();

        navigation.reset({
            index: 0,
            routes: [{ name: routerNames.signIn }],
        });
    }

    const startShift = async () => {
        await locationStore.startWatchingLocation();

        const tenSecondsFromNow = new Date();
        tenSecondsFromNow.setSeconds(new Date().getSeconds() + 10);

        await AsyncStorage.setItem(ILocationStore.SHIFT_END_TIME, JSON.stringify(tenSecondsFromNow.getTime()));
    }

    const endShift = async () => {
        await locationStore.stopWatchingLocation();
    }

    const assignHelpRequest = async () => {
        await dispatchStore.assignRequest('fake', [ userStore.user.id ]);
    }

    return (
        <Provider>
            <View>
                <Menu
                    visible={visible}
                    onDismiss={closeMenu}
                    anchor={<Button onPress={openMenu}>Menu</Button>}>
                    <Menu.Item title="Requests" />
                    <Menu.Item title="Chat" />
                    <Menu.Item title="Resources" />
                    <Menu.Item title="Schedule" />
                    <Menu.Item title="Sign Out" onPress={signout}/>
                </Menu>
                <Button onPress={startShift}>Start Shift</Button>
                <Button onPress={endShift}>End Shift</Button>
                <Button onPress={assignHelpRequest}>Assign Help Request</Button>
            </View>
        </Provider>
    );
};