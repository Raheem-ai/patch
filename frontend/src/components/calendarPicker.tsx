import React, { useRef, useState } from 'react'
import Calendar from 'react-native-calendar-picker';
import { View, Text, StyleSheet } from "react-native";
import { IconButton } from 'react-native-paper'
import moment from 'moment';
import STRINGS from '../../../common/strings';
import { Colors, ICONS } from "../types";

type DateChangedCallback = (date: moment) => void;

type CalendarPickerProps = {
    onDateChange?: DateChangedCallback | undefined;
    onMonthChange?: DateChangedCallback | undefined;
    initialDate: Date
}

const monthNames = [
    STRINGS.monthsOfYear.ja,
    STRINGS.monthsOfYear.fe,
    STRINGS.monthsOfYear.ma,
    STRINGS.monthsOfYear.ap,
    STRINGS.monthsOfYear.my,
    STRINGS.monthsOfYear.ju,
    STRINGS.monthsOfYear.jl,
    STRINGS.monthsOfYear.au,
    STRINGS.monthsOfYear.se,
    STRINGS.monthsOfYear.oc,
    STRINGS.monthsOfYear.no,
    STRINGS.monthsOfYear.de
];

const CalendarPicker = ({
    initialDate,
    onDateChange,
    onMonthChange,
}: CalendarPickerProps) => {

    const calPickerRef = useRef<Calendar>();

    // note that minDate and maxDate have to be set
    // if they're not desired, set them far off :-/
    const minDate=moment().date(1) // first of this month
    const maxDate=moment().add(1, 'y') // a year from now

    const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
    const [hidePreviousButton, setHidePreviousButton] = useState<boolean>(!moment(initialDate).isAfter(minDate, 'month'));
    const [hideNextButton, setHideNextButton] = useState<boolean>(!moment(initialDate).isBefore(maxDate, 'month'));

    const dateChanged = (mDate) => {
        // called whenever a new date is selected
        //  is this used anywhere? can we delete?
        onDateChange(mDate.toDate());
    }

    const monthChanged = (mDate) => {
        // called whenever the view is moved to a new month
        // used to keep local state in sync with CalendarPicker internal state
        setCurrentMonth(mDate.month() + 1);

        // disable nav at min/max months
        setHidePreviousButton(moment(mDate).isAfter(minDate, 'month') ? false : true);
        setHideNextButton(moment(mDate).isBefore(maxDate, 'month') ? false : true);
    }

    const goPreviousMonth = () => {
        // called whenever the previous icon is pressed
        // used to keep local state in sync with CalendarPicker internal state
        setCurrentMonth(currentMonth - 1);
        calPickerRef.current?.handleOnPressPrevious();
    }

    const goNextMonth = () => {
        // called whenever the next icon is pressed
        // used to keep local state in sync with CalendarPicker internal state
        setCurrentMonth(currentMonth + 1);
        calPickerRef.current?.handleOnPressNext();
    }

    // is this used anywhere? can we delete?
    const today = moment().hours(12).minutes(0).seconds(0).milliseconds(0);

    return (
        <>
        <View style={styles.calendarNavContainer}>
            <View  style={[styles.calendarNavPrevious, styles.calendarNavItem]}>
                <IconButton
                    style={{ flex: 0, height: 24, width: 24, alignSelf: 'center' }}
                    icon={ICONS.navBack}
                    color={hidePreviousButton ? Colors.nocolor : Colors.icons.dark}
                    disabled={hidePreviousButton}
                    onPress={goPreviousMonth}
                    size={24} />
            </View>
            <View  style={[styles.calendarNavCurrent, styles.calendarNavItem]}>
                <Text style={styles.calendarNavMonth}>{monthNames[currentMonth-1]}</Text>
            </View>
            <View  style={[styles.calendarNavNext, styles.calendarNavItem]}>
                <IconButton
                        style={{ flex: 0, height: 24, width: 24, alignSelf: 'center' }}
                        icon={ICONS.navForward}
                        color={Colors.icons.dark}
                        onPress={goNextMonth}
                        disabled={hideNextButton}
                        color={hideNextButton ? Colors.nocolor : Colors.icons.dark}
                        size={24} />
            </View>
        </View>

        <Calendar
            ref={calPickerRef}
            weekdays={[
                STRINGS.abbreviatedDaysOfWeek.su, 
                STRINGS.abbreviatedDaysOfWeek.mo,
                STRINGS.abbreviatedDaysOfWeek.tu,
                STRINGS.abbreviatedDaysOfWeek.we,
                STRINGS.abbreviatedDaysOfWeek.th,
                STRINGS.abbreviatedDaysOfWeek.fr,
                STRINGS.abbreviatedDaysOfWeek.sa
            ]}

            months={monthNames}
          
            onDateChange={dateChanged} 
            onMonthChange={monthChanged} 

            // need to restrict navigation with min/max to make
            // scroll behavior work right
            restrictMonthNavigation
            minDate={minDate}
            maxDate={maxDate}

            selectedStartDate={initialDate}
            initialDate={moment(initialDate)}
            scrollable={true}

            headerWrapperStyle={{ height: 0, margin: 0, padding: 0 }}
            customDayHeaderStyles={() => { return {
                textStyle: {color: Colors.text.tertiary, fontWeight: 400}}; }
            }

            dayLabelsWrapper={{ borderBottomWidth: 0, borderTopWidth: 0 }}

            // This library has weird styling precidence that doesn't honor dynamic styling and has a bug unique to wanting to style your 
            // today with the same background as other unselected days and have the selection styling work right so today can have selected styles
            // workaround is to just make the background for today a 3rd color -_-...even worse we can't change the text color for both the 
            // selected vs unselected today states so it has to default to the colors of other unselected/selected days
            selectedDayColor={styles.selectedStartDate.backgroundColor}
            selectedDayTextColor={styles.selectedStartDate.color}
            
            todayBackgroundColor={Colors.backgrounds.medium}
            todayTextStyle={Colors.text.default}
            textStyle={{ fontSize: 14, fontWeight: 700 }}
            />
        </>
    )
}

export default CalendarPicker;

const styles = StyleSheet.create({
    selectedStartDate: {
        color: '#fff',
        backgroundColor: '#000'
    },

    selectedStyle: {
        color: '#fff',
        backgroundColor: '#000'
    },
    selectedContainerStyle: {

    }, 
    selectedTextStyle: {
        
    },
    calendarNavContainer: {
        display: 'flex',
//        display: 'none',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 4,
        paddingHorizontal: 28,
        width: '100%',
        height: 42,
    },
    calendarNavItem: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarNavPrevious: {
        height: 24,
        width: 24,
    },
    calendarNavCurrent: {
        flexGrow: 1,
    },
    calendarNavMonth: {
        fontWeight: '700',
    },
    calendarNavNext: {
        height: 24,
        width: 24,
    }
})

