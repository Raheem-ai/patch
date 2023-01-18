// Here so stores can import functions to create React elements without having to be tsx files themselves

import { Pressable } from "react-native";
import { IconButton, Text } from "react-native-paper";
import STRINGS from "../../../common/strings";
import { Colors, ICONS } from "../types";
import { PromptConfig } from "./interfaces";


export function termsOfServicePrompt(
    onReject: () => void,
    onAccept: () => void,
    onLinkPressed: () => void
): PromptConfig {
    return {
        title: STRINGS.ACCOUNT.termsOfServiceDialogTitle(),
        message: (textStyle) => {
            return (
                <>
                    <Text style={textStyle}>
                        { STRINGS.ACCOUNT.termsOfServiceDialogMessage() }
                    </Text>
                    <Pressable onPress={onLinkPressed} style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center' }}>
                        <IconButton
                            style={{ alignSelf: 'center', margin: 0 , width: 20}}
                            icon={ICONS.linkOut} 
                            color={Colors.primary.alpha}
                            size={20} />
                        <Text style={[ 
                            textStyle, 
                            { 
                                textDecorationLine: 'underline', 
                                textDecorationColor: Colors.primary.alpha, 
                                color: Colors.primary.alpha,
                                marginLeft: 4
                            } 
                        ]}>
                            { STRINGS.ACCOUNT.termsOfServiceDialogLink() }
                        </Text>
                    </Pressable>
                </>
            )
        },
        actions: [
            {
                label: STRINGS.ACCOUNT.termsOfServiceDialogOptionNo(),
                onPress: onReject
            },
            {
                label: STRINGS.ACCOUNT.termsOfServiceDialogOptionYes(),
                onPress: onAccept,
                confirming: true
            }
        ]
    }
}