import React from "react";
import { View } from "react-native";
import { Text, Provider, Portal, Dialog, Paragraph, Button } from "react-native-paper";

/* We want this component to be generalizable and flexible enough to display dynamic messages */
// the peop will include the error message
export default function PopUpMessage(props) {
    // we assume that if we're here there is already an error
    //const [visible, setVisible] = React.useState(props.display);
    // this does show true, so the pop up should definitely display no?
    //console.log(visible);

    //const showDialog = () => setVisible(true);

    //const hideDialog = () => setVisible(false);

    return (
        /* Just displaying the text by itself works, the actual pop up doesn't, and i think it's because
        of the way that i am 
        <View>
            <Text>Hey there!</Text>
        </View>*/
        
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