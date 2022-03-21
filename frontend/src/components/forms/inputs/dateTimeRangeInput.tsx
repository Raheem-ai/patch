import { reloadAsync } from "expo-updates";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { dateToDateString, dateToDateYearString, dateToTimeString } from "../../../../../common/utils";
import { SectionViewProps } from "../types";
import WheelPicker from 'react-native-wheel-picker-expo';
import moment from 'moment'
import { DateTimeRange } from "../../../../../common/models";
import { first } from "lodash";
import { useWhenParamsChange } from "../../../hooks/useWhenParamsChange";
import CalendarPicker from 'react-native-calendar-picker';

enum TimeRangeSections {
    Start,
    End
}

type DateTimeRangeInput = SectionViewProps<'DateTimeRange'>;

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

type DateTimeRangeInputState = {
    [key in TimeRangeSections]: {
        hours?: number,
        minutes?: number,
        timeOfDay?: string
    }
}

const DateTimeRangeInput = observer(({ config }: DateTimeRangeInput) => {
    const [dayPickerOpen, setDayPickerOpen] = useState(false)
    const [timePickerOpen, setTimePickerOpen] = useState(false)
    const [currentSection, setCurrentSection] = useState<TimeRangeSections>(null)

    // const [internalState, setInternalState] = useState<DateTimeRangeInputState>({
    //     [TimeRangeSections.Start]: {},
    //     [TimeRangeSections.End]: {}
    // })

    // get this off the initial DateTimeRange passed
    const startParts = dateToDateTimeParts(config.val().startDate)
    const [startDay, setStartDay] = useState<string>(startParts[0])
    const [startHours, setStartHours] = useState<number>(startParts[1])
    const [startMinutes, setStartMinutes] = useState<number>(startParts[2])
    const [startTimeOfDay, setStartTimeOfDay] = useState<string>(startParts[3])

    const endParts = dateToDateTimeParts(config.val().endDate)
    const [endDay, setEndDay] = useState<string>(endParts[0])
    const [endHours, setEndHours] = useState<number>(endParts[1])
    const [endMinutes, setEndMinutes] = useState<number>(endParts[2])
    const [endTimeOfDay, setEndTimeOfDay] = useState<string>(endParts[3])


    useEffect(() => {

        let diff: Partial<DateTimeRange> = {};

        if (startDay && startHours && startMinutes && startTimeOfDay) {
            diff.startDate = timePartsToDate([startDay, startHours, startMinutes, startTimeOfDay])
        }

        if (endDay && endHours && endMinutes && endTimeOfDay) {
            diff.endDate = timePartsToDate([endDay, endHours, endMinutes, endTimeOfDay])
        }

        const cpy = Object.assign({}, config.val(), diff)

        console.log(cpy)

        config?.onChange?.(cpy)

    }, [
        startDay, startHours, startMinutes, startTimeOfDay,
        endDay, endHours, endMinutes, endTimeOfDay
    ]);
    
    const toggleDayPicker = (section: TimeRangeSections) => {
        const switchingSections = section != currentSection;
        
        if (switchingSections) {
            setTimePickerOpen(false)
            setDayPickerOpen(true)
        } else {
            if (!dayPickerOpen) {
                setTimePickerOpen(false)
            }

            setDayPickerOpen(!dayPickerOpen)
        }

        setCurrentSection(section)
    }

    const toggleTimePicker = (section: TimeRangeSections) => {
        const switchingSections = section != currentSection;
        
        if (switchingSections) {
            setTimePickerOpen(true)
            setDayPickerOpen(false)
        } else {
            if (!timePickerOpen) {
                setDayPickerOpen(false)
            }

            setTimePickerOpen(!timePickerOpen)
        }

        setCurrentSection(section)
    }

    const onHourChange = (section: TimeRangeSections, val: string) => {
        console.log('onHourChange', val);
        // const dateKey: keyof DateTimeRange = section == TimeRangeSections.Start 
        //     ? 'startDate' 
        //     : 'endDate';
        
        // const state = Object.assign({}, internalState[section]);
        
        // const date = moment(config.val()[dateKey]);

        // if (state.timeOfDay && state.timeOfDay.toLowerCase() == 'pm') {
        //     date.hours(parseInt(val)) // + pm shift ...  + (initialTimeOfDay == 1 ? 12 : 0)) % 24
        // } else {
        //     date.hours(parseInt(val))
        // }

        // const newVal = Object.assign({}, config.val())
        // newVal[dateKey] = date.toDate()

        // state.hours = date.hours();
        // state.hours = parseInt(val);

        // console.log(internalState)

        // setInternalState(Object.assign({}, internalState, {
        //     [section]: state
        // }))

        // config.onChange?.(newVal)

        (section == TimeRangeSections.Start
            ? setStartHours
            : setEndHours)(parseInt(val))
    }

    const onMinChange = (section: TimeRangeSections, val: string) => {
        console.log('onMinChange', val);
        // const dateKey: keyof DateTimeRange = section == TimeRangeSections.Start 
        //     ? 'startDate' 
        //     : 'endDate';
        
        // const state = Object.assign({}, internalState[section]);
        
        // const date = moment(config.val()[dateKey]);
        // date.minutes(parseInt(val))

        // const newVal = Object.assign({}, config.val())
        // newVal[dateKey] = date.toDate()

        // state.minutes = date.minutes();
        // state.minutes = parseInt(val)

        // setInternalState(Object.assign({}, internalState, {
        //     [section]: state
        // }))

        // config.onChange?.(newVal)

        (section == TimeRangeSections.Start
            ? setStartMinutes
            : setEndMinutes)(parseInt(val))
    }

    const onTimeOfDayChange = (section: TimeRangeSections, val: string) => {
        console.log('onTimeOfDayChange', val);
        // const dateKey: keyof DateTimeRange = section == TimeRangeSections.Start 
        //     ? 'startDate' 
        //     : 'endDate';

        // const state = Object.assign({}, internalState[section]);

        // const date = moment(config.val()[dateKey]);
        // date.hours(date.hours() + val.toLowerCase() == 'pm' ? 12 : -12)

        // const newVal = Object.assign({}, config.val())
        // newVal[dateKey] = date.toDate()

        // state.timeOfDay = val;

        // setInternalState(Object.assign({}, internalState, {
        //     [section]: state
        // }))

        // config.onChange?.(newVal)

        (section == TimeRangeSections.Start
            ? setStartTimeOfDay
            : setEndTimeOfDay)(val)
    }

    const onDayChange = (section: TimeRangeSections, val: string) => {
        console.log('onDayChange', val, typeof val);
        (section == TimeRangeSections.Start
            ? setStartDay
            : setEndDay)(val)
    }
    
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                    <IconButton
                        icon='clock-outline' 
                        color='#000'
                        size={20} 
                        style={{ margin: 0, padding: 0, width: 20 }}
                        />
            </View>
            <Section 
                date={config.val()?.startDate}
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
                date={config.val()?.endDate}
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
    date: Date,
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

type PickerOption = {
    label: string,
    value: string
}

const Section = ({
    date,
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

    // const mDate = moment(date);
    // const initialHour = HOURS.findIndex(val => parseInt(val) == ((mDate.hours() % 12) || 12))
    // const initialMin = MINUTES.findIndex(val => parseInt(val) == mDate.minutes() % 60)
    // const initialTimeOfDay = TIME_OF_DAY.findIndex(val => mDate.format('A') == val.toUpperCase())

    const parts = dateToDateTimeParts(date);
    const initialHour = HOURS.findIndex(val => {
        const hourVal = parseInt(val) 
        const hourPart = parts[1]

        if (!hourPart && hourVal == 12) {
            return true
        } else {
            return hourVal == hourPart
        }
    })
    const initialMin = MINUTES.findIndex(val => parseInt(val) == parts[2])
    const initialTimeOfDay = TIME_OF_DAY.findIndex(val => val.toLowerCase() == parts[3]?.toLocaleLowerCase())

    const onMinuteEvent = scrollPickerCB(({ item }) => onMinChange(section, item.value))
    const onHourEvent = scrollPickerCB(({ item }) => onHourChange(section, item.value))
    const onTimeOfDayEvent = scrollPickerCB(({ item }) => onTimeOfDayChange(section, item.value))

    // setup specific style for today's date
    const customDatesStyles = [];
    customDatesStyles.push({
        date: moment(), //today
        style: styles.todayStyle,
        allowDisabled: true, // allow custom style to apply to disabled dates
    })

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Pressable onPress={() => toggleDayPicker(section)}>
                    <Text style={{ lineHeight: 60 }}>{dateToDateString(date)}</Text>
                </Pressable>
                <Pressable onPress={() => toggleTimePicker(section)}>
                    <Text style={{ lineHeight: 60 }}>{dateToTimeString(date)}</Text>
                </Pressable>
            </View>
            {
                dayPickerOpen && section == currentSection    
                    ? <View style={{ backgroundColor: '#fff', marginLeft: -20}}>
                        <CalendarPicker 
                            weekdays={['S', 'M', 'T', 'W', 'T', 'F',  'S']}
                            // translate from moment to Date
                            onDateChange={(newDate) => onDayChange(section, dateToDateYearString(newDate.toDate()))} 
                            selectedStartDate={date}
                            initialDate={date}
                            showDayStragglers={true}

                            headerWrapperStyle={{ height: 0, margin: 0, padding: 0 }}
                            dayLabelsWrapper={{ borderBottomWidth: 0, borderTopWidth: 0 }}
                            customDayHeaderStyles={() => ({ backgroundColor: 'red' })}
                            
                            selectedDayColor={styles.selectedStartDate.backgroundColor}
                            selectedDayTextColor={styles.selectedStartDate.color}
                            
                            todayBackgroundColor={styles.selectedStartDate.color}
                            todayTextStyle={{ color: styles.selectedStartDate.backgroundColor }}
                            
                            customDatesStyles={customDatesStyles}/>
                    </View>
                    : null
            }
            {
                timePickerOpen && section == currentSection 
                    ? <View style={{ marginLeft: -20, flexDirection: 'row', justifyContent: 'center'}}>
                        <WheelPicker
                            width={40}
                            initialSelectedIndex={initialHour == -1 ? 0 : initialHour}
                            items={HOURS.map(name => ({ label: name, value: name }))}
                            onChange={onHourEvent} />
                        <WheelPicker
                            width={40}
                            initialSelectedIndex={initialMin == -1 ? 0 : initialMin}
                            items={MINUTES.map(name => ({ label: name, value: name }))}
                            onChange={onMinuteEvent} />
                        <WheelPicker
                            width={40}
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

const scrollPickerCB = function (fn: ({ index: number, item: PickerOption}) => void) {
    return useWhenParamsChange<{ index: number, item: PickerOption}>(fn, (oldParams, newParams) => {
        return oldParams?.item?.value != newParams.item.value
    })
}

type DateParts = [string, number, number, string]

const dateToDateTimeParts = (date: Date): DateParts => {
    const mDate = moment(date);

    return [
        dateToDateYearString(date), 
        mDate.hours() % 12, 
        mDate.minutes(), 
        mDate.hours() >= 12 ? 'pm' : 'am'
    ]
}

const timePartsToDate = (params: DateParts): Date => {    
    const mmnt = moment(params[0]);
    
    const hoursToSet = params[1] + (params[3].toLowerCase() == 'pm' ? 12 : 0)
    mmnt.hours(hoursToSet)

    mmnt.minutes(params[2])

    mmnt.seconds(0)
    mmnt.milliseconds(0)

    const date = mmnt.toDate()

    console.log('timePartsToDate', date, dateToDateYearString(date), params)

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
        left: -20,
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
        paddingLeft: 40,
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