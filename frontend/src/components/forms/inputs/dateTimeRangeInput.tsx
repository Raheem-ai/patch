import { reloadAsync } from "expo-updates";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { dateToDateString, dateToDateYearString, dateToTimeString } from "../../../../../common/utils";
import { SectionInlineViewProps } from "../types";
import moment from 'moment'
import { DateTimeRange } from "../../../../../common/models";
import { first, isNumber } from "lodash";
import { useWhenParamsChange } from "../../../hooks/useWhenParamsChange";
// import CalendarPicker from 'react-native-calendar-picker';
import WheelPicker from "../../wheelPicker";
import CalendarPicker from "../../calendarPicker";

enum TimeRangeSections {
    Start,
    End
}

type DateTimeRangeInputProps = SectionInlineViewProps<'DateTimeRange'>;

const HOURS = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12'
]

const MINUTES = [
    '00',
    '05',
    '10',
    '15',
    '20',
    '25',
    '30',
    '35',
    '40',
    '45',
    '50',
    '55',
]

const TIME_OF_DAY = [ 'AM', 'PM' ]


type DateParts = {
    date: string, 
    hours: number, 
    minutes: number, 
    timeOfDay: 'pm' | 'am'
}

const DateTimeRangeInput = observer(({ config }: DateTimeRangeInputProps) => {
    // initialize interal state
    const [dayPickerOpen, setDayPickerOpen] = useState(false)
    const [timePickerOpen, setTimePickerOpen] = useState(false)
    const [currentSection, setCurrentSection] = useState<TimeRangeSections>(null)

    const startParts = dateToDateTimeParts(config.val().startDate)
    const [startDay, setStartDay] = useState<string>(startParts.date)
    const [startHours, setStartHours] = useState<number>(startParts.hours)
    const [startMinutes, setStartMinutes] = useState<number>(startParts.minutes)
    const [startTimeOfDay, setStartTimeOfDay] = useState<DateParts['timeOfDay']>(startParts.timeOfDay)

    const endParts = dateToDateTimeParts(config.val().endDate)
    const [endDay, setEndDay] = useState<string>(endParts.date)
    const [endHours, setEndHours] = useState<number>(endParts.hours)
    const [endMinutes, setEndMinutes] = useState<number>(endParts.minutes)
    const [endTimeOfDay, setEndTimeOfDay] = useState<DateParts['timeOfDay']>(endParts.timeOfDay)

    useEffect(() => {

        let diff: Partial<DateTimeRange> = {};

        diff.startDate = datePartsToDate({
            date: startDay, 
            hours: startHours, 
            minutes: startMinutes, 
            timeOfDay: startTimeOfDay
        })

        const cpy = Object.assign({}, config.val(), diff)

        // update parent when our internal state changes
        config?.onChange?.(cpy)

    }, [
        startDay,
        startHours, 
        startMinutes, 
        startTimeOfDay
    ]);

    useEffect(() => {

        let diff: Partial<DateTimeRange> = {};

        diff.endDate = datePartsToDate({
            date: endDay, 
            hours: endHours, 
            minutes: endMinutes, 
            timeOfDay: endTimeOfDay
        })

        const cpy = Object.assign({}, config.val(), diff)

        // update parent when our internal state changes
        config?.onChange?.(cpy)

    }, [
        endDay,
        endHours, 
        endMinutes, 
        endTimeOfDay
    ]);
    
    // clicking on the DayPicker for one section should close the pickers on the other section
    const toggleDayPicker = (section: TimeRangeSections) => {
        const switchingSections = section != currentSection;
        
        // toggle == open when switching sections
        if (switchingSections) {
            setTimePickerOpen(false)
            setDayPickerOpen(true)
        } else {
        // actually toggle day picker and close the time picker
            if (!dayPickerOpen) {
                setTimePickerOpen(false)
            }

            setDayPickerOpen(!dayPickerOpen)
        }

        setCurrentSection(section)
    }

    // clicking on the TimePicke for one section should close the pickers on the other section
    const toggleTimePicker = (section: TimeRangeSections) => {
        const switchingSections = section != currentSection;
        
        // toggle == open when switching sections
        if (switchingSections) {
            setTimePickerOpen(true)
            setDayPickerOpen(false)
        } else {
        // actually toggle time picker and close the day picker

            if (!timePickerOpen) {
                setDayPickerOpen(false)
            }

            setTimePickerOpen(!timePickerOpen)
        }

        setCurrentSection(section)
    }

    const onHourChange = (section: TimeRangeSections, val: string) => {
        (section == TimeRangeSections.Start
            ? setStartHours
            : setEndHours)(parseInt(val))
    }

    const onMinChange = (section: TimeRangeSections, val: string) => {
        (section == TimeRangeSections.Start
            ? setStartMinutes
            : setEndMinutes)(parseInt(val))
    }

    const onTimeOfDayChange = (section: TimeRangeSections, val: DateParts['timeOfDay']) => {
        (section == TimeRangeSections.Start
            ? setStartTimeOfDay
            : setEndTimeOfDay)(val)
    }

    const onDayChange = (section: TimeRangeSections, val: string) => {
        (section == TimeRangeSections.Start
            ? setStartDay
            : setEndDay)(val)
    }
    
    return (
        <View style={styles.container}>
            {/* <View style={styles.iconContainer}>
                    <IconButton
                        icon='clock-outline' 
                        color='#000'
                        size={20} 
                        style={{ margin: 0, padding: 0, width: 20 }}
                        />
            </View> */}
            <Section 
                dateParts={{
                    date: startDay, 
                    hours: startHours, 
                    minutes: startMinutes, 
                    timeOfDay: startTimeOfDay
                }}
                section={TimeRangeSections.Start}
                toggleDayPicker={toggleDayPicker}
                toggleTimePicker={toggleTimePicker}
                dayPickerOpen={dayPickerOpen}
                timePickerOpen={timePickerOpen}
                currentSection={currentSection}
                onDayChange={onDayChange}
                onHourChange={onHourChange}
                onMinChange={onMinChange}
                onTimeOfDayChange={onTimeOfDayChange} />
            <Section 
                dateParts={{
                    date: endDay, 
                    hours: endHours, 
                    minutes: endMinutes, 
                    timeOfDay: endTimeOfDay
                }}
                section={TimeRangeSections.End}
                toggleDayPicker={toggleDayPicker}
                toggleTimePicker={toggleTimePicker}
                dayPickerOpen={dayPickerOpen}
                timePickerOpen={timePickerOpen}
                currentSection={currentSection}
                onDayChange={onDayChange}
                onHourChange={onHourChange}
                onMinChange={onMinChange}
                onTimeOfDayChange={onTimeOfDayChange}/>
        </View>
    )
})

    

type SectionProps = {
    // date: Date,
    dateParts: DateParts,
    section: TimeRangeSections,
    dayPickerOpen: boolean,
    timePickerOpen: boolean,
    currentSection: TimeRangeSections,
    
    toggleDayPicker: (section: TimeRangeSections) => void,
    toggleTimePicker: (section: TimeRangeSections) => void,
    onDayChange: (section: TimeRangeSections, val: string) => void,
    onHourChange: (section: TimeRangeSections, val: string) => void,
    onMinChange: (section: TimeRangeSections, val: string) => void,
    onTimeOfDayChange: (section: TimeRangeSections, val: string) => void,
}

const Section = ({
    dateParts,
    section,
    dayPickerOpen,
    timePickerOpen,
    currentSection,
    toggleDayPicker,
    toggleTimePicker,
    onDayChange,
    onHourChange,
    onMinChange,
    onTimeOfDayChange,
}: SectionProps) => {
    const date = datePartsToDate(dateParts)

    const initialHour = HOURS.findIndex(val => {
        const hourVal = parseInt(val) 
        const hourPart = dateParts.hours

        if (!hourPart && hourVal == 12) {
            return true
        } else {
            return hourVal == hourPart
        }
    })

    const initialMin = MINUTES.findIndex(val => parseInt(val) == dateParts.minutes)
    const initialTimeOfDay = TIME_OF_DAY.findIndex(val => val.toLowerCase() == dateParts.timeOfDay?.toLowerCase())

    const onMinuteEvent = ({ item }) => onMinChange(section, item.value)
    const onHourEvent = ({ item }) => onHourChange(section, item.value)
    const onTimeOfDayEvent = ({ item }) => onTimeOfDayChange(section, item.value)
    const onDayEvent = (newDate) => onDayChange(section, dateToDateYearString(newDate))


    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Pressable onPress={() => toggleDayPicker(section)}>
                    <Text style={[styles.label, { lineHeight: 60 }]}>{dateToDateString(date)}</Text>
                </Pressable>
                <Pressable onPress={() => toggleTimePicker(section)}>
                    <Text style={[styles.label, { lineHeight: 60 }]}>{dateToTimeString(date)}</Text>
                </Pressable>
            </View>
            {
                dayPickerOpen && section == currentSection    
                    ? <View style={{ backgroundColor: '#fff', marginLeft: -60}}>
                        <CalendarPicker
                            onDateChange={onDayEvent} 
                            initialDate={date} />
                    </View>
                    : null
            }
            {
                timePickerOpen && section == currentSection 
                    ? <View style={{ marginLeft: -60, flexDirection: 'row', justifyContent: 'center'}}>
                        <WheelPicker
                            initialSelectedIndex={initialHour == -1 ? 0 : initialHour}
                            items={HOURS.map(name => ({ label: name, value: name }))}
                            onChange={onHourEvent} />
                        <WheelPicker
                            initialSelectedIndex={initialMin == -1 ? 0 : initialMin}
                            items={MINUTES.map(name => ({ label: name, value: name }))}
                            onChange={onMinuteEvent} />
                        <WheelPicker
                            initialSelectedIndex={initialTimeOfDay == -1 ? 0 : initialTimeOfDay}
                            items={TIME_OF_DAY.map(name => ({ label: name, value: name }))}
                            onChange={onTimeOfDayEvent} />
                    </View>
                    : null
            }
        </View>
    )
}

export default DateTimeRangeInput;

const dateToDateTimeParts = (date: Date): DateParts => {
    const mDate = moment(date);
    
    const parts: DateParts = {
        date: dateToDateYearString(date), 
        hours: mDate.hours() % 12, 
        minutes: mDate.minutes(), 
        timeOfDay: mDate.hours() >= 12 ? 'pm' : 'am'
    }
         
    return parts;
}
const datePartsToDate = (parts: DateParts): Date => {    
    const mmnt = moment(parts.date);
    
    const hoursToSet = parts.hours + 
        (parts.timeOfDay.toLowerCase() == 'pm' 
            ? parts.hours == 12 
                ? 0 // 12pm = 12 hours
                : 12 // 1-11pm = n + 12 hours ie 2pm = 14 hours
            : parts.hours == 12
                ? -12 // 12am = 0 hours
                : 0) // 1-11am = n hours ie 2am = 2 hours

    mmnt.hours(hoursToSet)

    mmnt.minutes(parts.minutes)

    mmnt.seconds(0)
    mmnt.milliseconds(0)

    const date = mmnt.toDate()

    return date
}

const styles = StyleSheet.create({
    label: {
        color: '#000',
        lineHeight: 24,
        fontSize: 18
    },
    container: {
        position: 'relative'
    },
    iconContainer: {
        height: 60,
        width: 60,
        position: 'absolute', 
        left: -60,
        justifyContent: 'center',
        alignContent: 'center',
        padding: 20
    },
    section: {
        minHeight: 60,
        position: "relative",
    },
    sectionHeader: {
        flexDirection: 'row',
        paddingLeft: 0,
        paddingRight: 20,
        justifyContent: 'space-between'
    },
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