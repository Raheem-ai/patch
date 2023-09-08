import React from "react";
import { Pressable } from "react-native";
import { Text } from "react-native-paper";
import { SectionNavigationLabelViewProps } from "../types";
import { Colors } from "../../../types";
import SelectableText from "../../helpers/selectableText";

type DescriptiveNavigationLabelProps = SectionNavigationLabelViewProps & { 
    name: string, 
    description?: string 
    inlineDescription?: boolean
}

const DescriptiveNavigationLabel = ({ 
    testID,
    expand,
    name,
    description,
    inlineDescription
}: DescriptiveNavigationLabelProps) => {
    const descriptionFontSize = description && description.length < 30
        ? 16
        : 14;

    const text = () => {
        const labelText = <SelectableText style={{ color: Colors.text.forms.fieldLabel , fontSize: 16 }}>{name}</SelectableText>;
        const descriptionText = <SelectableText style={{ color: Colors.text.forms.fieldDescription , fontSize: descriptionFontSize }}>{description}</SelectableText>;

        if (!description) {
            return labelText
        } else if (description && inlineDescription) {
            return (
                <Text>
                    {labelText}
                    {descriptionText}
                </Text>
            )
        } else {
            return <>
                {/* need to add the margin bottom here when they are stacked */}
                <SelectableText style={{ fontSize: 16, marginBottom: 6 }}>{name}</SelectableText>
                {descriptionText}
            </>
        }
    }

    return (
        <Pressable 
            sentry-label={testID}
            testID={testID}
            style={{ paddingVertical: 12}} 
            onPress={expand}
        >
            { text() }
        </Pressable>
    )
}

export default DescriptiveNavigationLabel;