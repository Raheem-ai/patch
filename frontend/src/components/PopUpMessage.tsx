import React from "react";
import { View } from "react-native";
import { Provider, Portal, Dialog, Paragraph, Button } from "react-native-paper";

/* We want this component to be generalizable and flexible enough to display dynamic messages */
// the peop will include the error message
export default function PopUpMessage(props) {
    // we assume that if we're here there is already an error
    const [visible, setVisible] = React.useState(true);

    const showDialog = () => setVisible(true);
  
    const hideDialog = () => setVisible(false);
  
    return (
      <Provider>
        <View>
          <Portal>
            <Dialog visible={visible} onDismiss={hideDialog}>
              <Dialog.Title>Error</Dialog.Title>
              <Dialog.Content>
                <Paragraph>{props.error}</Paragraph>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={hideDialog}>Try Again</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Provider>
    );
};