import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDaysFilter, CalendarDaysFilterToLabelMap, ShiftsRolesFilter, CalendarRolesFilterToLabelMap, ShiftNeedsPeopleFilter, CalendarNeedsPeopleFilterToLabelMap, RecurringDateTimeRange, RecurringPeriod, ShiftOccurrence } from "../../../common/models";
import { allEnumValues, dayNumToDayNameLabel, monthNumToMonthNameLabel } from "../../../common/utils";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { Colors, ICONS, ScreenProps } from "../types";
import TestIds from "../test/ids";
import { shiftStore } from "../stores/interfaces";
import { IconButton, Text } from "react-native-paper";
import ShiftOccurrenceCard from "../components/shiftCard/shiftOccurrenceCard";
import moment from "moment";
import { runInAction } from "mobx";

type Props = ScreenProps<'Calendar'>;

const Calendar = observer(({ navigation, route }: Props) => {
    // Filter which days to show on the calendar list (filter logic in this component)
    const daysFilters = allEnumValues<CalendarDaysFilter>(CalendarDaysFilter);
    const [selectedDaysFilter, setDaysFilter] = useState(CalendarDaysFilter.All)

    // Filter which shifts to display on the calendar list (filter logic in shift store)
    const shiftNeedsPeopleFilter = allEnumValues<ShiftNeedsPeopleFilter>(ShiftNeedsPeopleFilter);
    const shiftRolesFilter = allEnumValues<ShiftsRolesFilter>(ShiftsRolesFilter);

    const [isScrolled, setIsScrolled] = useState(false);

    const filterHeaderProps: ListHeaderProps = {
        openHeaderLabel: 'Show:',
        viewIsScrolled: isScrolled,
        optionConfigs: [
            {
                chosenOption: selectedDaysFilter,
                options: daysFilters,
                toHeaderLabel: (filter: CalendarDaysFilter) => {
                    return `${CalendarDaysFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: CalendarDaysFilter) => CalendarDaysFilterToLabelMap[filter],
                onUpdate: (opt) => setDaysFilter(opt)
            },
            {
                chosenOption: shiftStore().filter.needsPeopleFilter,
                options: shiftNeedsPeopleFilter,
                toHeaderLabel: (filter: ShiftNeedsPeopleFilter) => {
                    return `${CalendarNeedsPeopleFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: ShiftNeedsPeopleFilter) => CalendarNeedsPeopleFilterToLabelMap[filter],
                onUpdate: shiftStore().setNeedsPeopleFilter
            },
            {
                chosenOption: shiftStore().filter.rolesFilter,
                options: shiftRolesFilter,
                toHeaderLabel: (filter: ShiftsRolesFilter) => {
                    return `${CalendarRolesFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: ShiftsRolesFilter) => CalendarRolesFilterToLabelMap[filter],
                onUpdate: shiftStore().setRolesFilter
            },
        ] as [
            ListHeaderOptionConfig<CalendarDaysFilter>, 
            ListHeaderOptionConfig<ShiftNeedsPeopleFilter>, 
            ListHeaderOptionConfig<ShiftsRolesFilter>, 
        ]
    }

    useEffect(() => {
        runInAction(() => {
            shiftStore().setDateRange({
                startDate: new Date(moment().toDate()),
                endDate: new Date(moment().add(1, 'months').toDate()),
            });
        })
    }, [])

    const handleScroll = (e) => {
        // Screen Height
        const layoutHeight = e.nativeEvent.layoutMeasurement.height;

        // Height of all the calendar list content
        const contentHeight = e.nativeEvent.contentSize.height;

        // When the scroll reaches the content height minus the screen height
        // we've scrolled to the end of the list.
        const contentEnd = contentHeight - layoutHeight;

        // We want to trigger a fetch of new shifts a little before the user
        // reaches the very end of the list. Currently set to fetch more shifts
        // when we've scrolled through 80% of the list (by content height, not shift count).
        const fetchFutureTrigger = .8 * contentEnd;

        // If the y scroll offset reaches this threshold, expand our shift
        // date range by one week in the future.
        const yOffset = e.nativeEvent.contentOffset.y;
        if (yOffset >= fetchFutureTrigger) {
            runInAction(() => {
                shiftStore().addFutureWeekToDateRange();
            })
        }
    }

    const shiftOccurrenceCards = (shifts: ShiftOccurrence[]) => {
        // Iterate from the start date to the end date of the calendar's current date range.
        // Along the way, move through the array of shifts, adding the headings for each day
        // and the shift cards for each shift in the collection. This elements variable is the
        // collection of date headings and shift cards to display.
        let elements = []

        // Initialize the first date heading
        const currentHeadingDate = new Date(shiftStore().dateRange.startDate);

        // The last date to display on the calendar list
        const endDate = new Date(shiftStore().dateRange.endDate);

        // Index to track our iteration through the shift occurrences
        let currentShiftIndex = 0;

        // Loop until we've reached the last date in our date range
        while (currentHeadingDate <= endDate) {
            // Collect all shift cards to be displayed under the current date heading
            const shiftCards = [];

            // Ensure that we still have shifts to collect
            if (currentShiftIndex < shifts.length) {
                // Get the current shift's date as a moment object to make for easy comparison
                // to the current heading date. If the shift's date is on the same day as the 
                // current heading we want to add, then we generate and collect the shift's
                // card. Do this until we encounter a shift on a date after the current heading's date.
                let currentShiftDate = moment(shifts[currentShiftIndex].dateTimeRange.startDate);
                while (moment(currentShiftDate).isSame(moment(currentHeadingDate), 'day')) {
                    const shift = shifts[currentShiftIndex];
                    shiftCards.push(
                        <ShiftOccurrenceCard testID={TestIds.shiftsList.screen} style={styles.card} key={shift.id} shiftId={shift.shiftId} occurrenceId={shift.id} />
                    )

                    // Move on to the next shift in our collection.
                    // Update index and date variables, breaking if we've run out of shifts to evaluate.
                    currentShiftIndex++;
                    if (currentShiftIndex >= shifts.length) {
                        break;
                    }
                    currentShiftDate = moment(shifts[currentShiftIndex].dateTimeRange.startDate);
                }
            }

            // Disiplaying the date headings is conditional on the user's filter.
            let addDateHeading = false;
            switch (selectedDaysFilter) {
                case CalendarDaysFilter.All:
                    addDateHeading = true;
                    break;
                case CalendarDaysFilter.WithShifts:
                    addDateHeading = shiftCards.length > 0;
                    break;
                case CalendarDaysFilter.WithoutShifts:
                    addDateHeading = shiftCards.length == 0;
                    break;
            }

            if (addDateHeading) {
                // Extract the info for the date heading display
                const day = dayNumToDayNameLabel(currentHeadingDate.getDay());
                const month = monthNumToMonthNameLabel(currentHeadingDate.getMonth());
                const date = currentHeadingDate.getDate();

                // Add the date heading
                elements.push(
                    <View style={styles.dateHeading}>
                        <Text style={styles.dateText}>
                            <Text style={{fontWeight: 'bold'}}>{day} </Text><Text>{month} {date}</Text>
                        </Text>
                        <IconButton 
                            style={styles.addShiftButton} 
                            icon={ICONS.add} 
                            size={24}
                            color={Colors.icons.light}/>
                    </View>
                )
            }

            // Add the corresponding shift cards, directly after the heading,
            // if the user has not requested they be filtered out.
            if (selectedDaysFilter != CalendarDaysFilter.WithoutShifts) {
                elements = elements.concat(shiftCards);
            }

            // Move the date forward one day
            currentHeadingDate.setDate(currentHeadingDate.getDate() + 1);
        }

        return elements;
    }

    return (
        <View style={styles.container} testID={TestIds.shiftsList.screen}>
            <ListHeader { ...filterHeaderProps } />
            <ScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={1000}>
                {shiftOccurrenceCards(shiftStore().filteredShiftOccurrences)}
            </ScrollView>
        </View>
    )

})

export default Calendar

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f0f0',
        flex: 1,
    },
    card: {
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowRadius: 2,
        shadowOffset: {
            width: 0,
            height: 1
        }
    },
    dateHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: {
        margin: 12,
        fontSize: 14,
    },
    addShiftButton: {
        alignSelf: 'center',
        margin: 0,
    },
})