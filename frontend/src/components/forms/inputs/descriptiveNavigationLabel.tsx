import React from "react";
import { Pressable } from "react-native";
import { Text } from "react-native-paper";
import { SectionNavigationLabelViewProps } from "../types";

type DescriptiveNavigationLabelProps = SectionNavigationLabelViewProps & { 
    name: string, 
    description?: string 
    inlineDescription?: boolean
}

const DescriptiveNavigationLabel = ({ 
    expand,
    name,
    description,
    inlineDescription
}: DescriptiveNavigationLabelProps) => {
    const descriptionFontSize = description && description.length < 30
        ? 16
        : 14;

    const text = () => {
        const labelText = <Text style={{ fontSize: 16 }}>{name}</Text>;
        const descriptionText = <Text style={{ color: '#666', fontSize: descriptionFontSize }}>{description}</Text>;

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
                <Text style={{ fontSize: 16, marginBottom: 6 }}>{name}</Text>
                {descriptionText}
            </>
        }
    }

    return (
        <Pressable style={{ paddingVertical: 12}} onPress={expand}>
            { text() }
        </Pressable>
    )
}

export default DescriptiveNavigationLabel;