import React from 'react'
import Calendar from 'react-native-calendar-picker';
import { View, StyleSheet, Pressable } from "react-native";
import moment from 'moment';

type CalendarPickerProps = {
    onDateChange: (date: Date) => void,
    intitalDate: Date
}

// TODO: 
// - handle UI when today is the chosen day
// - swipe left/right to change month
const CalendarPicker = ({
    intitalDate,
    onDateChange
}: CalendarPickerProps) => {

    // setup specific style for today's date
    const customDatesStyles = [];
    customDatesStyles.push({
        date: moment(), //today
        style: styles.todayStyle,
        allowDisabled: true, // allow custom style to apply to disabled dates
    })

    return (
        <Calendar
            weekdays={['S', 'M', 'T', 'W', 'T', 'F',  'S']}
            // translate from moment to Date
            onDateChange={(mDate) => onDateChange(mDate.toDate())} 
            selectedStartDate={intitalDate}
            initialDate={intitalDate}
            showDayStragglers={true}

            headerWrapperStyle={{ height: 0, margin: 0, padding: 0 }}
            dayLabelsWrapper={{ borderBottomWidth: 0, borderTopWidth: 0 }}
            // customDayHeaderStyles={() => ({ backgroundColor: 'red' })}
            
            selectedDayColor={styles.selectedStartDate.backgroundColor}
            selectedDayTextColor={styles.selectedStartDate.color}
            
            todayBackgroundColor={styles.selectedStartDate.color}
            todayTextStyle={{ color: styles.selectedStartDate.backgroundColor }}
            
            customDatesStyles={customDatesStyles}/>
    )
}

export default CalendarPicker;

const styles = StyleSheet.create({
    selectedStartDate: {
        color: '#fff',
        backgroundColor: '#000'
    },
    todayStyle: {
        borderBottomWidth: 3, 
        borderColor: '#000',
        borderRadius: 0
    }
})