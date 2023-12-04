import React from "react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { HelpRequest, ProtectedUser, UserRole } from "../../../common/front";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import UserIcon from "./userIcon";
import { Colors } from "../types";
import SelectableText from "./helpers/selectableText";

type Props = {
    testID: string,
    responder: ClientSideFormat<ProtectedUser>,
    orgId: string,
    style?: StyleProp<ViewStyle>,
    request?: HelpRequest
    isSelected?: boolean,
    onPress?: (event: GestureResponderEvent) => void
}

const ResponderRow = ({ testID, responder, orgId, style, request, isSelected, onPress }: Props) => {
    const attributes = (responder.organizations[userStore().currentOrgId]?.attributes || [])
            .map(attr => manageAttributesStore().getAttribute(attr.categoryId, attr.itemId))
            .filter(a => !!a);

    return (
        <Pressable testID={testID} onPress={onPress} style={[styles.responderRow, style ]}>
            <View style={styles.userIconContainer}>
                <UserIcon userId={responder.id} large/>
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}> 
                <View>
                    <View style={styles.responderHeader}>
                        <SelectableText style={styles.responderLabel}>{responder.name}</SelectableText>
                    </View>
                </View>
                <View style={styles.skillTagsContainer}>
                    {
                        attributes.map((attr, i) => {
                            const addDelim = i < attributes.length - 1;

                            return addDelim 
                                ? <>
                                    <SelectableText style={styles.skillDelim}>{attr.name}</SelectableText>
                                    <SelectableText style={styles.skillDelim}>{'·'}</SelectableText>
                                </>
                                : <SelectableText style={styles.skillDelim}>{attr.name}</SelectableText>

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
