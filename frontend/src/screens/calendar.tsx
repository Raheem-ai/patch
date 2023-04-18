import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDaysFilter, CalendarDaysFilterToLabelMap, ShiftsRolesFilter, CalendarRolesFilterToLabelMap, ShiftNeedsPeopleFilter, CalendarNeedsPeopleFilterToLabelMap, RecurringDateTimeRange, RecurringPeriod } from "../../../common/models";
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
    const daysFilters = allEnumValues<CalendarDaysFilter>(CalendarDaysFilter);
    const shiftNeedsPeopleFilter = allEnumValues<ShiftNeedsPeopleFilter>(ShiftNeedsPeopleFilter);

    // TODO: Dynamically add to enum
    const shiftRolesFilter = allEnumValues<ShiftsRolesFilter>(ShiftsRolesFilter);

    const [isScrolled, setIsScrolled] = useState(false);
    const [selectedDaysFilter, setDaysFilter] = useState(CalendarDaysFilter.All)

    const filterHeaderProps: ListHeaderProps = {
        openHeaderLabel: 'Show:',
        closedHeaderStyles: styles.closedFilterHeader,
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
    
    // TODO: Find permanent place for this.
    useEffect(() => {
        runInAction(() => {
            // TODO: call this function to fetch new shifts based on scroll index
            shiftStore().setDateRange({
                startDate: new Date(moment().toDate()),
                endDate: new Date(moment().add(1, 'months').toDate()),
            });
        })
    }, [])

    // TODO: Generate this window based on user scroll/viewport and update shiftStore.dateRange
    let currentDate: Date = new Date(shiftStore().dateRange.startDate);

    const handleScroll = (e) => {
        setIsScrolled(e.nativeEvent.contentOffset.y <= 4
            ? false
            : true)}

    // TODO: Iterate through date range and pick up shifts instead of
    // iterating through shifts and collecting date headings.
    const getDateHeadings = (shiftDate: Date) => {
        const headings = [];
        while (moment(shiftDate).isSameOrAfter(moment(currentDate), 'day')) {
            const day = dayNumToDayNameLabel(currentDate.getDay());
            const month = monthNumToMonthNameLabel(currentDate.getMonth());
            const date = currentDate.getDate();

            let addHeading = false;
            switch (selectedDaysFilter) {
                case CalendarDaysFilter.All:
                    addHeading = true;
                    break;
                case CalendarDaysFilter.WithShifts:
                    addHeading = moment(shiftDate).isSame(moment(currentDate), 'day');
                    break;
                case CalendarDaysFilter.WithoutShifts:
                    addHeading = moment(shiftDate).isAfter(moment(currentDate), 'day');
                    break;
            }

            if (addHeading) {
                headings.push(
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

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return headings;
    }

    return (
        <View style={styles.container} testID={TestIds.shiftsList.screen}>
            <ListHeader { ...filterHeaderProps } />
            <ScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={120}>
                {
                    shiftStore().filteredShiftOccurrences.map(s => {
                        return (
                            <>
                                {getDateHeadings(s.dateTimeRange.startDate)}
                                {selectedDaysFilter != CalendarDaysFilter.WithoutShifts
                                    ? <ShiftOccurrenceCard testID={TestIds.shiftsList.screen} style={styles.card} key={s.id} shiftId={s.shiftId} occurrenceId={s.id} />
                                    : null}
                            </>
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