import React from "react";
import { View } from "react-native";
import { Provider, Portal, Dialog, Paragraph, Button } from "react-native-paper";

export default function PopUpMessage() {
    const [visible, setVisible] = React.useState(false);

    const showDialog = () => setVisible(true);
  
    const hideDialog = () => setVisible(false);
  
    return (
      <Provider>
        <View>
          <Button onPress={showDialog}>Show Dialog</Button>
          <Portal>
            <Dialog visible={visible} onDismiss={hideDialog}>
              <Dialog.Title>Alert</Dialog.Title>
              <Dialog.Content>
                <Paragraph>This is simple dialog</Paragraph>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={hideDialog}>Done</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </Provider>
    );
};