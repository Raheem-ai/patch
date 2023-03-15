import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDaysFilter, CalendarDaysFilterToLabelMap, CalendarRolesFilter, CalendarRolesFilterToLabelMap, CalendarShiftsFilter, CalendarShiftsFilterToLabelMap, HelpRequestFilter, HelpRequestFilterToLabelMap, HelpRequestSortBy, HelpRequestSortByToLabelMap } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { ScreenProps } from "../types";
import TestIds from "../test/ids";

type Props = ScreenProps<'Calendar'>;

const Calendar = observer(({ navigation, route }: Props) => {
    const daysFilters = allEnumValues<CalendarDaysFilter>(CalendarDaysFilter);
    const shiftsFilters = allEnumValues<CalendarShiftsFilter>(CalendarShiftsFilter);

    // TODO: Dynamically add to enum
    const rolesFilters = allEnumValues<CalendarRolesFilter>(CalendarRolesFilter);

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
                onUpdate: () => {} // requestStore().setFilter,
            },
            {
                chosenOption: CalendarShiftsFilter.All,
                options: shiftsFilters,
                toHeaderLabel: (filter: CalendarShiftsFilter) => {
                    return `${CalendarShiftsFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: CalendarShiftsFilter) => CalendarShiftsFilterToLabelMap[filter],
                onUpdate: () => {} // requestStore().setFilter,
            },
            {
                chosenOption: CalendarRolesFilter.All,
                options: rolesFilters,
                toHeaderLabel: (filter: CalendarRolesFilter) => {
                    return `${CalendarRolesFilterToLabelMap[filter]}`
                },
                toOptionLabel: (filter: CalendarRolesFilter) => CalendarRolesFilterToLabelMap[filter],
                onUpdate: () => {} // requestStore().setFilter,
            },
        ] as [
            ListHeaderOptionConfig<CalendarDaysFilter>, 
            ListHeaderOptionConfig<CalendarShiftsFilter>, 
            ListHeaderOptionConfig<CalendarRolesFilter>, 
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