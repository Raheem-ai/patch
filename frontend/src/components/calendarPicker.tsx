import React, { useState } from 'react'
import Calendar from 'react-native-calendar-picker';
import { View, StyleSheet, Pressable } from "react-native";
import moment from 'moment';
import STRINGS from '../../../common/strings';

type CalendarPickerProps = {
    onDateChange: (date: Date) => void,
    initialDate: Date
}

const CalendarPicker = ({
    initialDate,
    onDateChange
}: CalendarPickerProps) => {

    const dateChanged = (mDate) => {
        onDateChange(mDate.toDate())
    }

    const today = moment().hours(12).minutes(0).seconds(0).milliseconds(0);

    return (
        <Calendar
            weekdays={[
                STRINGS.abbreviatedDaysOfWeek.su, 
                STRINGS.abbreviatedDaysOfWeek.mo,
                STRINGS.abbreviatedDaysOfWeek.tu,
                STRINGS.abbreviatedDaysOfWeek.we,
                STRINGS.abbreviatedDaysOfWeek.th,
                STRINGS.abbreviatedDaysOfWeek.fr,
                STRINGS.abbreviatedDaysOfWeek.sa]}
            onDateChange={dateChanged} 

            // need to restrict navigation with min/max to make
            // scroll behavior work right
            restrictMonthNavigation
            minDate={moment().date(1)}// first of this month
            maxDate={moment().add(1, 'y')} // a year from now

            selectedStartDate={initialDate}
            initialDate={moment(initialDate)}
            showDayStragglers={true}
            scrollable={true}

            headerWrapperStyle={{ height: 0, margin: 0, padding: 0 }}
            dayLabelsWrapper={{ borderBottomWidth: 0, borderTopWidth: 0 }}

            // This library has weird styling precidence that doesn't honor dynamic styling and has a bug unique to wanting to style your 
            // today with the same background as other unselected days and have the selection styling work right so today can have selected styles
            // workaround is to just make the background for today a 3rd color -_-...even worse we can't change the text color for both the 
            // selected vs unselected today states so it has to default to the colors of other unselected/selected days
            selectedDayColor={styles.selectedStartDate.backgroundColor}
            selectedDayTextColor={styles.selectedStartDate.color}
            
            todayBackgroundColor={'#999'}
            />
    )
}

export default CalendarPicker;

const styles = StyleSheet.create({
    selectedStartDate: {
        color: '#fff',
        backgroundColor: '#000'
    },
    todayStyle: {
        color: '#000',
        backgroundColor: '#fff',
        borderBottomWidth: 3, 
        borderColor: '#000',
        borderRadius: 0
    },
    selectedStyle: {
        color: '#fff',
        backgroundColor: '#000'
    },
    selectedContainerStyle: {

    }, 
    selectedTextStyle: {
        
    }
})

