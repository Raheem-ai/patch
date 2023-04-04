import React, { useState } from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestPriority, RequestStatus, RequestStatusToLabelMap, RequestTypeToLabelMap, RequestDetailsTabs, ShiftOccurrence } from "../../../../common/models";
import { requestStore, userStore, organizationStore, shiftStore } from "../../stores/interfaces";
import { navigateTo } from "../../navigation";
import { routerNames, Colors, ICONS } from "../../types";
import UserIcon from "../userIcon";
import { ActiveRequestTabHeight } from "../../constants";
import { StatusIcon, StatusSelector } from "../statusSelector";
import STRINGS from "../../../../common/strings";
import TestIds from "../../test/ids";
import { positionStats } from "../../../../common/utils/requestUtils";

type Props = {
    testID: string,
    shiftId: string,
    instanceId: string,
    style?: StyleProp<ViewStyle>,
    dark?: boolean,
    minimal?: boolean,
    onMapView?: boolean,
    onPress?: (event: GestureResponderEvent, shiftInstace: ShiftOccurrence) => void
};

const ShiftInstanceCard = observer(({
    testID,
    shiftId,
    instanceId,
    style,
    dark,
    minimal,
    onMapView,
    onPress
} : Props) => {
    // TODO: get shift instance, not shift
    const shift = shiftStore().shifts.get(shiftId);
    return <Text>{shift.description}</Text>
})

export default ShiftInstanceCard;

const RESPONDER_SPACING_BASIC = 6;
const RESPONDER_SPACING_LAST = 12;
const RESPONDER_SPACING_PILED = -8;

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.standard,
        borderBottomColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderTopWidth: 4
    },
    darkContainer: {
        backgroundColor: Colors.backgrounds.dark,
    },
    minimalContainer: {
        height: ActiveRequestTabHeight ,
        paddingBottom: 12,
        paddingHorizontal: 12,
        justifyContent: 'space-evenly',
        borderTopWidth: 0,
        borderBottomWidth: 0,

    },
    darkText: {
        color: '#E0DEE0'
    },
    headerRow: {
        margin: 12,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    locationContainer: {
        flexDirection: 'row'
    },
    locationIcon: { 
        width: 12,
        color: Colors.icons.light,
        alignSelf: 'center',
        margin: 0
    },
    locationText: {
        fontSize: 12,
        alignSelf: 'center'
    },
    idText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    detailsRow: {
        margin: 12,
        marginTop: 0,
        flexDirection: 'row'
    },
    darkDetailsText: {
        color: '#E0DEE0'
    },
    typeText: {
        fontWeight: 'bold'
    },
    statusRow: {
        margin: 12,
        marginTop: 0,
        height: 28, // keeps row from collapsing when there are no positions and status selector is opened
        flexDirection: 'row',
    }, 
    responderActions: {
        flexDirection: 'row',
        flex: 1
    },
    messageIcon: {
        color: Colors.good,
        backgroundColor: Colors.backgrounds.standard,
        width: 28,
        height: 28,
        margin: 0,
        marginRight: 4,
        borderRadius: 0
    },
    messageIconDark: {
        color: Colors.good,
        backgroundColor: Colors.nocolor
    },
    unreadMessageNotifier: {
        backgroundColor: '#00C95C',
        height: 10,
        width: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.backgrounds.standard,
        position: 'absolute',
        top: -2,
        right: 2,
        zIndex: 1,
        display: 'none'
    },
    darkUnreadMessageNotifier: {
        borderColor: '#444144',
    },
    unAssignedResponderIcon: {
        color: Colors.icons.dark,
        backgroundColor: '#F3F1F3',
        borderColor: Colors.backgrounds.standard,
        borderWidth: 1,
        marginRight: RESPONDER_SPACING_BASIC,
    }, 
    unAssignedResponderIconDark: {
        color: '#444144',
        backgroundColor: '#CCCACC',
        borderColor: Colors.backgrounds.dark,
        borderWidth: 1,
        marginRight: RESPONDER_SPACING_BASIC,
    },
    assignedResponderIcon: {
        marginRight: RESPONDER_SPACING_PILED,
        borderWidth: 1,
        borderColor: Colors.backgrounds.standard,
    }, 
    assignedResponderIconDark: {
        marginRight: RESPONDER_SPACING_PILED,
        borderColor: Colors.icons.superdark,
    }, 
    assignedResponderIconLast: {
        marginRight: RESPONDER_SPACING_BASIC,
    }, 
    responderCount: {
        alignSelf: 'center',
        marginRight: RESPONDER_SPACING_LAST,
        color: Colors.text.tertiary,
        fontSize: 12
    },
    broadcastButtonLabel: {
        color: '#DB0000',
        marginVertical: 0,
        marginLeft: 8,
        marginRight: 0,
        alignSelf: 'center'
    }, 
    broadcastButton: {
        marginHorizontal: 0,
        alignSelf: 'center',
        // borderRadius: 16
    }, 
    broadcastContent: { 
        // no other way to touch the internal icon margin :/
        marginLeft: -12,
        marginRight: 0,
        padding: 6,
    },
    statusContainer: {
        flexDirection: 'row'
    },
    statusText: {
        alignSelf: 'center',
        fontSize: 12
    }, 
    darkStatusText: {
        color: '#E0DEE0'
    },
    statusSelector: {
        position: 'absolute',
        flexDirection: 'row',
        right: -6,
        bottom: -6,
        padding: 6,
        zIndex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        shadowRadius: 3,
        shadowColor: '#ccc',
        shadowOpacity: 1,
        shadowOffset: {
            height: 2,
            width: 0
        },
        width: 200
    },
    darkStatusSelector: {
        backgroundColor: '#333',
        shadowColor: '#000',
        borderColor: '#444',
        borderWidth: 1,
        paddingHorizontal: 8
    },
    empty: {
        color: Colors.icons.light,
        backgroundColor: Colors.icons.light,
        width: 26,
        height: 26,
        alignSelf: 'center',
        borderRadius: 48,
        marginVertical: 0,
        marginRight: RESPONDER_SPACING_BASIC,
        marginLeft: -30,
        zIndex: -100,
    },
    emptyDark: {
        color: Colors.icons.darkReversed,
        backgroundColor: Colors.icons.darkReversed,
    }
})