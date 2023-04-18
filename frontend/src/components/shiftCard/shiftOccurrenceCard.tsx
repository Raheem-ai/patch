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
import { PositionStatus } from "../../../../common/models";

type Props = {
    testID: string,
    shiftId: string,
    occurrenceId: string,
    style?: StyleProp<ViewStyle>,
    dark?: boolean,
    minimal?: boolean,
    onMapView?: boolean,
    onPress?: (event: GestureResponderEvent, shiftOccurence: ShiftOccurrence) => void
};

const ShiftOccurrenceCard = observer(({
    testID,
    shiftId,
    occurrenceId,
    style,
    dark,
    minimal,
    onMapView,
    onPress
} : Props) => {
    const parentshift = shiftStore().shifts.get(shiftId);
    const shiftOccurrence = shiftStore().getShiftOccurrence(occurrenceId);

    const onCardPress = (event: GestureResponderEvent) => {
        console.log('shift occurrence card pressed')
        /*
        if (onPress) {
            onPress(event, null);
        } else {
            shiftStore().setCurrentShiftInstance(null)
            navigateTo(routerNames.shiftOccurrenceDetails);
        }
        */
    }

    const getFormattedTime = (date: Date) => {
        let amPm = 'am';
        let hours = new Date(date).getHours();
        const minutes = new Date(date).getMinutes();

        if (hours >= 12) {
            amPm = 'pm';
            if (hours != 12) {
                hours = hours - 12;
            }
        } else {
            amPm = 'am'
            if (hours == 0) {
                hours = 12;
            }
        }

        const minutesText = minutes == 0
            ? ''
            : minutes < 10 
                ? `:0${minutes}`
                : `:${minutes}`

        return `${hours}${minutesText}${amPm}`
    }

    const shiftStatusIndicator = () => {
        const shiftSatisfied = shiftStore().getShiftOccurrencePositionStatus(shiftOccurrence) == PositionStatus.MinSatisfied;
        return (
            <View style={styles.indicatorContainer}>
                { shiftSatisfied 
                    ? <View style={styles.shiftSatisfiedIndicator}/>
                    : <View style={styles.shiftNeedsPeopleIndicator}/>
                }
            </View>
        )
    }

    const recurrenceIcon = () => {
        if (!parentshift.recurrence) {
            return null;
        }

        return (
            <IconButton
                icon={ICONS.refresh} 
                color='#666'
                size={20} 
                style={{ margin: 0, marginLeft: 6, padding: 0, width: 20 }}
            />
        )
    }

    const positionRows = () => {
        if (shiftOccurrence.positions.length == 0) {
            return null;
        }

        const rows = []
        rows.push(
            <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
        )

        for (const position of shiftOccurrence.positions) {
            const joinedUserIcons = position.joinedUsers.map(userId => {
                return <UserIcon userId={userId}/>
            })

            const neededUsers = Math.max(0, position.min - position.joinedUsers.length);
            const unassignedUserIcons = Array(neededUsers).fill(0).map((_, i) => {
                return (
                    <UserIcon style={ dark ? styles.unAssignedResponderIconDark : styles.unAssignedResponderIcon }
                        emptyIconColor={styles.unAssignedResponderIcon.color}/>
                )
            });
            rows.push(
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 60, marginTop: 15}}>
                    <Text>{organizationStore().roles.get(position.role).name}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {joinedUserIcons}
                        {unassignedUserIcons}
                    </View>
                </View>
            )
        }

        return rows;
    }

    const header = () => {
        // TODO: Get start and end times from shift instance
        const startTimeStr = getFormattedTime(shiftOccurrence.dateTimeRange.startDate);
        const endTimeStr = getFormattedTime(shiftOccurrence.dateTimeRange.endDate);

        // TODO: Add recurrence symbol, when warranted
        return (
            <>
                <View style={{flexDirection: 'row'}}>
                    {shiftStatusIndicator()}
                    <View style={styles.headerRow}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={[styles.idText, dark ? styles.darkText : null]}>{shiftOccurrence.title}</Text>
                            {recurrenceIcon()}
                        </View>
                        <View style={{flexDirection: 'column', alignItems: 'flex-end'}}>
                            <Text>{startTimeStr}</Text>
                            <Text style={styles.endTimeText}>{endTimeStr}</Text>
                        </View>
                    </View>
                </View>
                {positionRows()}
            </>
        )
    }

    // TODO: Add Roles needed and positions filled UI
    return (
        <Pressable
            onPress={onCardPress}
            testID={TestIds.shiftOccurrenceCard(testID, occurrenceId)}
            style={[styles.container, styles.minimalContainer, style]}>
                {header()}
        </Pressable>
    )
})

export default ShiftOccurrenceCard;

const RESPONDER_SPACING_BASIC = 6;
const RESPONDER_SPACING_LAST = 12;
const RESPONDER_SPACING_PILED = -8;

const styles = StyleSheet.create({
    endTimeText: {
        color: Colors.text.tertiary,
    },
    indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // borderColor: Colors.good,
        // borderWidth: 1
    },
    shiftNeedsPeopleIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        borderWidth: 4,
        borderColor: Colors.okay,
        marginHorizontal: (56 - 12)/2,
    },
    shiftSatisfiedIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: Colors.good,
        marginHorizontal: (56 - 12)/2
    },
    iconContainer: {
        height: 60,
        width: 60,
        position: 'absolute', 
        justifyContent: 'center',
        alignContent: 'center',
        alignSelf: 'flex-start',
        padding: 20
    },
    section: {
        minHeight: 60,
        borderStyle: 'solid',
        borderBottomColor: Colors.borders.formFields,
        borderBottomWidth: 1,
        alignItems: 'center',
        flexDirection: 'row',
        width: '100%',
        paddingLeft: 60,
        //   paddingRight: 20,
        justifyContent: 'space-between',
        position: 'relative'
    }, 
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
        flex: 1,
        marginVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // borderColor: Colors.bad,
        // borderWidth: 1
    },
    headerTime: {
        flexDirection: 'column',
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