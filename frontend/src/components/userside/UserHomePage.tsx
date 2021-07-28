import React from "react";
import { Text, View } from "react-native";
import { Button, Menu, Provider } from "react-native-paper";
import { getStore } from "../../di";
import { IUserStore } from "../../interfaces";
import { routerNames, UserHomeNavigationProp } from "../../types";

type Props = {
    navigation: UserHomeNavigationProp;
};

export default function UserHomePage({ navigation }: Props) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

    const userStore = getStore<IUserStore>(IUserStore);

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