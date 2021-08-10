import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Button, Menu, Provider } from "react-native-paper";
import { getStore } from "../../di";
import { ILocationStore, INotificationStore, IUserStore } from "../../interfaces";
import { routerNames, UserHomeNavigationProp } from "../../types";
import * as Location from 'expo-location';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationType } from "../../../../common/models";

type Props = {
    navigation: UserHomeNavigationProp;
};

export default function UserHomePage({ navigation }: Props) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

    const userStore = getStore<IUserStore>(IUserStore);
    const locationStore = getStore<ILocationStore>(ILocationStore);
    const notificationStore = getStore<INotificationStore>(INotificationStore);

    useEffect(() => {
        (async () => {

            const fgHandle = locationStore.addForegroundCallback((loc) => {
                console.log('FOREGROUND: ', `${loc.coords.latitude}, ${loc.coords.longitude}`)
            })

            notificationStore.onNotification(NotificationType.AssignedIncident, console.log)
            notificationStore.onNotificationResponse(NotificationType.AssignedIncident, console.log)

            await notificationStore.startListeningForNotifications();

        })();
      }, []);


    const signout = async () => {
        await userStore.signOut();
        navigation.navigate(routerNames.signIn);
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
            </View>
        </Provider>
    );
};