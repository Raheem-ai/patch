import React from "react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { HelpRequest, ProtectedUser, UserRole } from "../../../common/models";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import UserIcon from "./userIcon";
import { Colors } from "../types";

type Props = {
    responder: ClientSideFormat<ProtectedUser>,
    orgId: string,
    style?: StyleProp<ViewStyle>,
    request?: HelpRequest
    isSelected?: boolean,
    onPress?: (event: GestureResponderEvent) => void
}

const ResponderRow = ({ responder, orgId, style, request, isSelected, onPress }: Props) => {
    const attributes = (responder.organizations[userStore().currentOrgId]?.attributes || []).map(attr => manageAttributesStore().getAttribute(attr.categoryId, attr.itemId));

    return (
        <Pressable onPress={onPress} style={[styles.responderRow, style ]}>
            <View style={styles.userIconContainer}>
                <UserIcon user={responder} large/>
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}> 
                <View>
                    <View style={styles.responderHeader}>
                        <Text style={styles.responderLabel}>{responder.name}</Text>
                    </View>
                </View>
                <View style={styles.skillTagsContainer}>
                    {
                        attributes.map((attr, i) => {
                            const addDelim = i < attributes.length - 1;

                            return addDelim 
                                ? <>
                                    <Text style={styles.skillDelim}>{attr.name}</Text>
                                    <Text style={styles.skillDelim}>{'·'}</Text>
                                </>
                                : <Text style={styles.skillDelim}>{attr.name}</Text>

                        })
                    }
                </View>
            </View>
        </Pressable>
    )
}

export default ResponderRow;

const styles = StyleSheet.create({
    responderRow: {
        flexDirection: 'row',
        alignContent: 'center',
        marginBottom: 16
    },
    responderLabel: {
        fontWeight: 'bold',
        fontSize: 14
    },
    responderHeader: {
        flexDirection: 'row',
        alignContent: 'center',
        height: 18
    },
    userIconContainer: {
        marginRight: 8,
        justifyContent: 'center'
    },
    skillDelim: {
        color: Colors.text.tertiary,
        fontSize: 12,
        alignSelf: 'center',
        marginRight: 4,
    },
    skillTagsContainer: {
        flexDirection: 'row', 
        flexWrap: 'wrap',
        marginTop: 2,
    },
    skillTag: { 
        marginTop: 4 
    }
})
