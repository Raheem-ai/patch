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
import { wrapScrollView } from "react-native-scroll-into-view";

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = ScreenProps<'Calendar'>;

const Calendar = observer(({ navigation, route }: Props) => {
    // Filter which shifts to display on the calendar list
    const daysFilters = allEnumValues<CalendarDaysFilter>(CalendarDaysFilter);
    const shiftNeedsPeopleFilter = allEnumValues<ShiftNeedsPeopleFilter>(ShiftNeedsPeopleFilter);
    const shiftRolesFilter = allEnumValues<ShiftsRolesFilter>(ShiftsRolesFilter);

    const [isScrolled, setIsScrolled] = useState(false);

    const filterHeaderProps: ListHeaderProps = {
        openHeaderLabel: 'Show:',
        viewIsScrolled: isScrolled,
        optionConfigs: [
            {
                chosenOption: shiftStore().filter.daysFilter,
                options: daysFilters,
                toHeaderLabel: (filter: CalendarDaysFilter) => {
                    return `${CalendarDaysFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: CalendarDaysFilter) => CalendarDaysFilterToLabelMap[filter],
                onUpdate: shiftStore().setDaysFilter
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
        shiftStore().setDateRange({
            startDate: new Date(moment().minutes(0).hours(0).seconds(0).toDate()),
            endDate: new Date(moment().minutes(0).hours(0).seconds(0).add(1, 'months').toDate()),
        });
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
            shiftStore().addFutureWeekToDateRange();
        }
    }

    const shiftOccurrenceCards = (shifts: ShiftOccurrence[]) => {
        return shifts.map(shift => {
            return <ShiftOccurrenceCard testID={TestIds.shiftsList.screen} style={styles.card} key={shift.id} shiftId={shift.shiftId} occurrenceId={shift.id} />
        })
    }

    const dateHeading = (headingDate: Date) => {
        // Extract the info for the date heading display
        const day = dayNumToDayNameLabel(headingDate.getDay());
        const month = monthNumToMonthNameLabel(headingDate.getMonth());
        const date = headingDate.getDate();
        return (
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

    return (
        <View style={styles.container} testID={TestIds.shiftsList.screen}>
            <ListHeader { ...filterHeaderProps } />
            <WrappedScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={1000}>
                {shiftStore().filteredShiftOccurenceMetadata.map(metadata => {
                    return (
                        <>
                            {dateHeading(metadata.date)}
                            {shiftOccurrenceCards(metadata.occurrences)}
                        </>
                    )
                })}
            </WrappedScrollView>
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