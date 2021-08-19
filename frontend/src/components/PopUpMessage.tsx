import React from "react";
import { View } from "react-native";
import { Text, Provider, Portal, Dialog, Paragraph, Button } from "react-native-paper";

/* We want this component to be generalizable and flexible enough to display dynamic messages */
// the peop will include the error message
export default function PopUpMessage(props) {
    return (
        <Provider>
            <View>
                <Portal>
                    <Dialog visible={props.display} onDismiss={props.hideDialog}>
                        <Dialog.Title>Error</Dialog.Title>
                        <Dialog.Content>
                            <Paragraph>{props.error}</Paragraph>
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={props.hideDialog}>Try Again</Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>
            </View>
        </Provider>
    );
};