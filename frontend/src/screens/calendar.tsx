import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDaysFilter, CalendarDaysFilterToLabelMap, ShiftsRolesFilter, CalendarRolesFilterToLabelMap, ShiftInstancesFilter, CalendarShiftsFilterToLabelMap } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { ScreenProps } from "../types";
import TestIds from "../test/ids";
import { shiftStore } from "../stores/interfaces";
import { Text } from "react-native-paper";

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

    return (
        <View style={styles.container} testID={TestIds.requestList.screen}>
            <ListHeader { ...filterHeaderProps } />
            <ScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={120}>
                {
                    shiftStore().filteredShiftInstances.map(shiftInstance => {
                        console.log('Shift: ', shiftInstance);
                        return (
                            <Text>{shiftInstance.description}</Text>
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