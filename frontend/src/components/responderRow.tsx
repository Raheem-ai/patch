import React from "react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { HelpRequest, ProtectedUser, UserRole } from "../../../common/models";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import SkillTag from "./skillTag";
import UserIcon from "./userIcon";

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
            <View style={{ flex: 1 }}> 
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
        marginBottom: 12
    },
    dispatcherContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        height: 18,
        marginLeft: 4
    },
    dispatchIcon: {
        color: '#7F7C7F',
        width: 12,
        margin: 0,
        alignSelf: 'center',
    },
    dispatcherLabelContainer: {
        justifyContent: 'center',
        marginLeft: 4
    },
    dispatcherLabel: {
        color: '#7F7C7F',
        fontSize: 12,
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
        marginRight: 4,
        justifyContent: 'center'
    },
    skillDelim: {
        color: '#CCCACC',
        fontSize: 12,
        alignSelf: 'center',
        marginRight: 4,
    },
    skillTagsContainer: {
        flexDirection: 'row', 
        flexWrap: 'wrap'
    },
    skillTag: { 
        marginTop: 4 
    }
})