import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDaysFilter, CalendarDaysFilterToLabelMap, ShiftsRolesFilter, CalendarRolesFilterToLabelMap, ShiftInstancesFilter, CalendarShiftsFilterToLabelMap, RecurringDateTimeRange, RecurringPeriod } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { ScreenProps } from "../types";
import TestIds from "../test/ids";
import { shiftStore } from "../stores/interfaces";
import { Text } from "react-native-paper";
import ShiftInstanceCard from "../components/shiftCard/shiftInstanceCard";
import moment from "moment";

type Props = ScreenProps<'Calendar'>;

const Calendar = observer(({ navigation, route }: Props) => {
    const daysFilters = allEnumValues<CalendarDaysFilter>(CalendarDaysFilter);
    const shiftInstanceFilters = allEnumValues<ShiftInstancesFilter>(ShiftInstancesFilter);

    // TODO: Dynamically add to enum
    const shiftsFilters = allEnumValues<ShiftsRolesFilter>(ShiftsRolesFilter);

    const [isScrolled, setIsScrolled] = useState(false);

    const filterHeaderProps: ListHeaderProps = {
        openHeaderLabel: 'Show:',
        closedHeaderStyles: styles.closedFilterHeader,
        viewIsScrolled: isScrolled,
        optionConfigs: [
            {
                chosenOption: CalendarDaysFilter.All,
                options: daysFilters,
                toHeaderLabel: (filter: CalendarDaysFilter) => {
                    return `${CalendarDaysFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: CalendarDaysFilter) => CalendarDaysFilterToLabelMap[filter],
                onUpdate: () => {} // TODO: Remove empty days,
            },
            {
                chosenOption: shiftStore().shiftInstancesFilter,
                options: shiftInstanceFilters,
                toHeaderLabel: (filter: ShiftInstancesFilter) => {
                    return `${CalendarShiftsFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: ShiftInstancesFilter) => CalendarShiftsFilterToLabelMap[filter],
                onUpdate: shiftStore().setInstancesFilter
            },
            {
                chosenOption: shiftStore().shiftsFilter,
                options: shiftsFilters,
                toHeaderLabel: (filter: ShiftsRolesFilter) => {
                    return `${CalendarRolesFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: ShiftsRolesFilter) => CalendarRolesFilterToLabelMap[filter],
                onUpdate: shiftStore().setShiftsFilter
            },
        ] as [
            ListHeaderOptionConfig<CalendarDaysFilter>, 
            ListHeaderOptionConfig<ShiftInstancesFilter>, 
            ListHeaderOptionConfig<ShiftsRolesFilter>, 
        ]
    }

    const handleScroll = (e) => {
        setIsScrolled(e.nativeEvent.contentOffset.y <= 4
            ? false
            : true)}
    
    const recurrence: RecurringDateTimeRange = {
        every: {
            period: RecurringPeriod.Week,
            days: [0, 1, 3, 5],
            numberOf: 2,
        },
        until: {
            date: null,
            repititions: 4
        },
        startDate: moment().hour(12).minutes(30).toDate(), // Today @ 12:30pm 
        endDate: moment().hour(12).minutes(30).add(2, 'hours').toDate(), // Today @ 2:30pm 
    };

    console.log('Calendar about to call for projected dates...')
    const finalDate: Date = moment().hour(14).minutes(30).add(30, 'days').toDate();
    const projectedDates = shiftStore().projectRecurringDateTimes(recurrence, finalDate);
    console.log('Projected Dates: ');
    for (const date of projectedDates) {
        console.log(date);
    }
    return (
        <View style={styles.container} testID={TestIds.shiftsList.screen}>
            <ListHeader { ...filterHeaderProps } />
            <ScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={120}>
                {
                    shiftStore().filteredShiftInstances.map(s => {
                        return (
                            <ShiftInstanceCard testID={TestIds.shiftsList.screen} style={styles.card} key={s.id} shiftId={s.shiftId} instanceId={s.id} />
                        )
                    })
                }
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
    closedFilterHeader: {
        // marginBottom: 12
    }
})