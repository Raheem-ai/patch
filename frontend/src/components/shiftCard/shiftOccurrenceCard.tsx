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
        // Given a date, we're interested in displaying the time strings
        // in a user-friendly format.
        let amPm = 'am';
        let hours = new Date(date).getHours();
        const minutes = new Date(date).getMinutes();

        // Convert from 24 hour to am/pm format.
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

        // If the minutes are ":00" for the specified time,
        // we don't want to display any minute text. If the minutes
        // are single digits, we want to prepend the 0 for uniformity.
        const minutesText = minutes == 0
            ? ''
            : minutes < 10 
                ? `:0${minutes}`
                : `:${minutes}`

        return `${hours}${minutesText}${amPm}`
    }

    const shiftStatusIndicator = () => {
        // Determine which style the shift status indicator should render based on the
        // shift's need for more people to join or not.
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
        // Display a recurrence icon if the shift repeats.
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
        // If there are no positions specified, we don't have any visual elements to display.
        if (shiftOccurrence.positions.length == 0) {
            return null;
        }

        // If we have position rows to generate, first we want to add a separator/divider to the card.
        const rows = []
        rows.push(
            <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
        )

        // Iterate through each position on the shift and generate a row for it that contains the Role name,
        // icons for the joined users, and generic icons for the number of users needed to satisfy the position.
        for (const position of shiftOccurrence.positions) {
            // Generate a user icon for each joined user
            const joinedUserIcons = position.joinedUsers.map(userId => {
                return <UserIcon userId={userId}/>
            })

            // Figure out how many users are still needed to join and generate a generic icon for each.
            const neededUsers = Math.max(0, position.min - position.joinedUsers.length);
            const unassignedUserIcons = Array(neededUsers).fill(0).map((_, i) => {
                return (
                    <UserIcon style={ dark ? styles.userNeededIconDark : styles.userNeededIcon }
                        emptyIconColor={styles.userNeededIcon.color}/>
                )
            });

            // Add the row with the role name and the icons we created above.
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
        // For the card's header, get the start and end time strings in the display format.
        const startTimeStr = getFormattedTime(shiftOccurrence.dateTimeRange.startDate);
        const endTimeStr = getFormattedTime(shiftOccurrence.dateTimeRange.endDate);

        // The header of a shift card includes the status of its positions, the title, recurrence, and time info.
        return (
            <View style={{flexDirection: 'row'}}>
                {shiftStatusIndicator()}
                <View style={styles.headerRow}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.titleText, dark ? styles.darkText : null]}>{shiftOccurrence.title}</Text>
                        {recurrenceIcon()}
                    </View>
                    <View style={{flexDirection: 'column', alignItems: 'flex-end'}}>
                        <Text>{startTimeStr}</Text>
                        <Text style={styles.endTimeText}>{endTimeStr}</Text>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <Pressable
            onPress={onCardPress}
            testID={TestIds.shiftOccurrenceCard(testID, occurrenceId)}
            style={[styles.container, styles.minimalContainer, style]}>
                {header()}
                {positionRows()}
        </Pressable>
    )
})

export default ShiftOccurrenceCard;

const USER_NEEDED_SPACING_BASIC = 6;
const styles = StyleSheet.create({
    endTimeText: {
        color: Colors.text.tertiary,
    },
    indicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
    titleText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    userNeededIcon: {
        color: Colors.icons.dark,
        backgroundColor: '#F3F1F3',
        borderColor: Colors.backgrounds.standard,
        borderWidth: 1,
        marginRight: USER_NEEDED_SPACING_BASIC,
    }, 
    userNeededIconDark: {
        color: '#444144',
        backgroundColor: '#CCCACC',
        borderColor: Colors.backgrounds.dark,
        borderWidth: 1,
        marginRight: USER_NEEDED_SPACING_BASIC,
    }
})