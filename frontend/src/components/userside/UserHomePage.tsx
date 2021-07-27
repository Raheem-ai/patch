import React from "react";
import { Text, View } from "react-native";
import { Button, Menu, Provider } from "react-native-paper";

export default function UserHomePage() {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

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
                </Menu>
            </View>
        </Provider>
    );
};