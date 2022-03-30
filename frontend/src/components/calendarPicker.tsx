import React, { useState } from 'react'
import Calendar from 'react-native-calendar-picker';
import { View, StyleSheet, Pressable } from "react-native";
import moment from 'moment';

type CalendarPickerProps = {
    onDateChange: (date: Date) => void,
    initialDate: Date
}

// TODO: 
// - handle UI when today is the chosen day
const CalendarPicker = ({
    initialDate,
    onDateChange
}: CalendarPickerProps) => {

    const [currentDate, setCurrentDate] = useState(initialDate)

    const dateChanged = (mDate) => {
        onDateChange(mDate.toDate())
        setCurrentDate(mDate.toDate())
    }

    const today = moment();
    const todayIsSelected = !!(currentDate && moment(currentDate).isSame(today, 'day'))

    // setup specific style for today's date
    const customDatesStyles = [];
    customDatesStyles.push({
        date: today, //today
        // textStyle: styles.todayTextStyle,
        style: [ styles.todayStyle, todayIsSelected ? styles.selectedStyle : null ],
        // containerStyle: styles.todayContainerStyle,
        allowDisabled: true, // allow custom style to apply to disabled dates
    })

    if (!todayIsSelected) {
        // setup specific styles for the selected day when it isn't today
        // TODO: this style wont take for some reason
        customDatesStyles.push({
            date: moment(currentDate).clone(), //selected date
            textStyle: { color: styles.selectedStyle.color },
            style: styles.selectedStyle,
            containerStyle: [],
            allowDisabled: true, // allow custom style to apply to disabled dates
        })
    }

    return (
        <Calendar
            weekdays={['S', 'M', 'T', 'W', 'T', 'F',  'S']}
            // translate from moment to Date
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
            
            textStyle={{ color: styles.selectedStartDate.backgroundColor }}
            // selectedDayColor={styles.selectedStartDate.backgroundColor}
            // selectedDayTextColor={styles.selectedStartDate.color}
            // selectedDayTextStyle={{ color: styles.selectedStartDate.color }}
            
            // todayBackgroundColor={styles.selectedStartDate.color}
            // todayTextStyle={{ color: styles.selectedStartDate.backgroundColor }}
            
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