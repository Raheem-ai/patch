import React from "react";
import { observer } from "mobx-react";
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ShiftOccurrence, ShiftStatus } from "../../../../common/models";
import { organizationStore, shiftStore } from "../../stores/interfaces";
import { Colors, ICONS, routerNames } from "../../types";
import UserIcon from "../userIcon";
import TestIds from "../../test/ids";
import { dateToDisplayTime } from "../../../../common/utils";
import moment from "moment";
import { navigateTo } from "../../navigation";

type Props = {
    testID: string,
    shiftId: string,
    occurrenceId: string,
    style?: StyleProp<ViewStyle>
    onPress?: (event: GestureResponderEvent, shiftOccurence: ShiftOccurrence) => void
};

const ShiftOccurrenceCard = observer(({
    testID,
    shiftId,
    occurrenceId,
    style,
    onPress
} : Props) => {
    const parentshift = shiftStore().shifts.get(shiftId);
    const shiftOccurrence = shiftStore().getShiftOccurrence(occurrenceId);
    const now = moment();
    const pastShift = moment(shiftOccurrence.dateTimeRange.startDate).isBefore(now);

    const onCardPress = (event: GestureResponderEvent) => {
        console.log('shift occurrence card pressed')
        if (onPress) {
            onPress(event, null);
        } else {
            shiftStore().setCurrentShiftOccurrence(shiftOccurrence);
            navigateTo(routerNames.shiftDetails);
        }
    }

    const shiftStatusIndicator = () => {
        // Determine which style the shift status indicator should render based on the
        // shift's need for more people to join or not.
        const shiftStatus = shiftStore().getShiftStatus(shiftOccurrence);
        return (
            <View style={styles.indicatorContainer}>
                { shiftStatus == ShiftStatus.Satisfied 
                    ? <View style={[styles.statusIndicator, styles.statusSatisfied]}/>
                    : shiftStatus == ShiftStatus.PartiallySatisfied
                        ? <View style={[styles.statusIndicator, styles.statusPartiallySatisfied]}/>
                        : <View style={[styles.statusIndicator, styles.statusEmpty]}/>
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
            const userIcons = position.joinedUsers.map(userId => {
                return <UserIcon userId={userId}/>
            })

            // Figure out how many users are still needed to join and generate a generic icon for each.
            const neededUsers = Math.max(0, position.min - position.joinedUsers.length);
            for (let i = 0; i < neededUsers; i++) {
                userIcons.push(
                    <UserIcon style={ styles.userNeededIcon }
                        emptyIconColor={styles.userNeededIcon.color}/>
                )
            }

            // Add the row with the role name and the icons we created above.
            rows.push(
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 60, marginTop: 15}}>
                    <Text>{organizationStore().roles.get(position.role).name}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {userIcons}
                    </View>
                </View>
            )
        }

        return rows;
    }

    const header = () => {
        // For the card's header, get the start and end time strings in the display format.
        const startTimeStr = dateToDisplayTime(shiftOccurrence.dateTimeRange.startDate);
        const endTimeStr = dateToDisplayTime(shiftOccurrence.dateTimeRange.endDate);

        // The header of a shift card includes the status of its positions, the title, recurrence, and time info.
        return (
            <View style={{flexDirection: 'row'}}>
                {shiftStatusIndicator()}
                <View style={styles.headerRow}>
                    <View style={{flexDirection: 'row', alignItems: 'center', maxWidth: '80%'}}>
                        <Text style={styles.titleText}>{shiftOccurrence.title}</Text>
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
            style={[pastShift ? styles.pastContainer : styles.container, styles.minimalContainer, style]}>
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
        alignItems: 'center'
    },
    statusIndicator: {
        height: 20,
        width: 20,
        borderRadius: 20,
        marginHorizontal: (60 - 20)/2,
    },
    statusEmpty: {
        borderWidth: 6,
        borderColor: Colors.bad,
    },
    statusPartiallySatisfied: {
        borderWidth: 6,
        borderColor: Colors.okay,
    },
    statusSatisfied: {
        backgroundColor: Colors.good,
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
    pastContainer: {
        backgroundColor: '#ECEBEC',
        borderBottomColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderTopWidth: 4
    },
    minimalContainer: {
        paddingBottom: 12,
        paddingRight: 12,
        justifyContent: 'space-evenly',
        borderTopWidth: 0,
        borderBottomWidth: 0,
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
    }
})