import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { Button, Menu, Provider } from "react-native-paper";
import { getStore } from "../../di";
import { ILocationStore, IUserStore } from "../../interfaces";
import { routerNames, UserHomeNavigationProp } from "../../types";
import * as Location from 'expo-location';

type Props = {
    navigation: UserHomeNavigationProp;
};

export default function UserHomePage({ navigation }: Props) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

    const userStore = getStore<IUserStore>(IUserStore);
    const locationStore = getStore<ILocationStore>(ILocationStore);

    useEffect(() => {
        (async () => {
          await locationStore.askForPermission()
          await locationStore.watchLocation((l) => console.log('FOREGROUND LOCATION:', l))
        })();
      }, []);


    const signout = async () => {
        await userStore.signOut();
        navigation.navigate(routerNames.signIn);
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
            </View>
        </Provider>
    );
};