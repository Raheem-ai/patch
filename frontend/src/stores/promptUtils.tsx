// Here so stores can import functions to create React elements without having to be tsx files themselves

import { Text } from "react-native-paper";
import STRINGS from "../../../common/strings";
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
                <Text style={textStyle} >
                    { STRINGS.ACCOUNT.termsOfServiceDialogMessagePart1() }
                    <Text style={[ textStyle, {textDecorationLine: 'underline', textDecorationColor: textStyle.color} ]} onPress={onLinkPressed}>{ STRINGS.ACCOUNT.termsOfServiceDialogMessagePart2() }</Text>
                    { STRINGS.ACCOUNT.termsOfServiceDialogMessagePart3() }
                </Text>
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