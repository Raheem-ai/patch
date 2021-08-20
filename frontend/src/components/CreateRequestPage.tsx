import React from "react";
import { View } from "react-native";
import { Divider, Title, Text } from "react-native-paper";

export default function CreateRequestPage() {
    return (
        <View>
            <Title>Request</Title>
            <Divider />
            <Text>Location</Text>
            <Divider />
            <Text>Types of request</Text>
            <Divider />
            <Text>Notes</Text>
            <Divider />
            <Text>Skills required</Text>
            <Divider />
            <Text>Other requirements</Text>
        </View>
    );
};