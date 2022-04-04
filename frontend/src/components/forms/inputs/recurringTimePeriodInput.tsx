// 

import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { DateTimeRange, RecurringPeriod, RecurringTimeConstraints, RecurringTimePeriod } from "../../../../../common/models";
import { dateToDateYearString, dateToEndDateLabel, dateToEndRepititionsLabel, dayNumToDayNameLabel, daysToRecurringDaysLabel, dayToNthDayOfMonthLabel, dayToNthDayOfWeekLabel } from "../../../../../common/utils";
import CalendarPicker from "../../calendarPicker";
import WheelPicker, { PickerOption } from "../../wheelPicker";
import { SectionScreenViewProps } from "../types";
import BackButtonHeader from "./backButtonHeader";
import moment from 'moment'
import { alertStore } from "../../../stores/interfaces";

type RecurringTimePeriodInputProps = SectionScreenViewProps<'RecurringTimePeriod'>;

const RECURRING_PERIODS: PickerOption[] = [
    {
        label: 'day',
        value: RecurringPeriod.Day,
    },
    {
        label: 'week',
        value: RecurringPeriod.Week,
    },
    {
        label: 'month',
        value: RecurringPeriod.Month
    }
]

const numberRange = (start: number, end: number) => {
    const arr = []

    for (let i = start; i <= end; i++) {
        arr.push(i);
    }

    return arr;
}

const NUMBER_OF_DAYS = numberRange(1, 30) // 30 days
const NUMBER_OF_WEEKS = numberRange(1, 51) // 51 weeks
const NUMBER_OF_MONTHS = numberRange(1, 12) // 12 months
const NUMBER_OF_REPITITIONS = numberRange(1, 999)

const DAY_PICKER_OPTIONS: PickerOption<number>[] = [
    {
        label: 'M',
        value: 1
    }, 
    {
        label: 'T',
        value: 2
    }, 
    {
        label: 'W',
        value: 3
    }, 
    {
        label: 'T',
        value: 4
    }, 
    {
        label: 'F',
        value: 5
    }, 
    {
        label: 'S',
        value: 6
    },
    {
        label: 'S',
        value: 0
    }
]

const DEFAULT_STATE: RecurringTimeConstraints = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 1,
        days: []
    }
}

const RecurringTimePeriodInput = ({ back, config }: RecurringTimePeriodInputProps) => {
    const [state, setState] = useState<RecurringTimeConstraints>(Object.assign({}, config.val()));
    const [endOnDayOpen, setEndOnDayOpen] = useState(false);
    const [endOnRepititionOpen, setEndOnRepititionOpen] = useState(false);

    const save = () => {

        const _save = () => {
            config.onSave(state);
            back();
        }

        const updateStartDay = (date: Date) => {
            const diff = Object.assign({}, config.props.dateTimeRange(), { startDate: date })
            config.props.updateDateTimeRange(diff)
            _save();
        }
        // if repeating weekly with specific days of the week, make sure one of the selected days alings with the
        // start day of the DateTimeRange...if it doesn't, prompt to see if they want to update the DTR or cancel
        if (state.every.period == RecurringPeriod.Week) {
            const startDate = moment(config.props.dateTimeRange().startDate)
            const startDateDay = startDate.day();

            if (!state.every.days.includes(startDateDay)) {
                const newStartDate = startDate.clone().day(state.every.days[0])
                
                return alertStore().showPrompt({
                    title: config.props.updateStartDatePromptTitle(startDate.toDate(), newStartDate.toDate()),
                    message: config.props.updateStartDatePromptMessage(startDate.toDate(), newStartDate.toDate()),
                    actions: [
                        {
                            label: 'Cancel',
                            onPress: () => {},
                        },
                        {
                            label: 'Move Shift',
                            onPress: () => updateStartDay(newStartDate.toDate()),
                            confirming: true
                        }
                    ]
                })
            }
        }

        _save()
    }

    const clearRecurrance = () => {
        setState({});
    }

    const clearRecurranceEnd = () => {
        const diff = Object.assign({}, state);
        diff.until = null;

        setState(diff);
    }

    const setRecurringPeriod = ({ item }: { item: PickerOption<RecurringPeriod> }) => {
        const diff = Object.assign({}, state);
        diff.every.period = item.value;
        
        // make sure at least one period scope is set but not both
        if (diff.every.period == RecurringPeriod.Month && !diff.every.weekScope) {
            diff.every.dayScope = true;
        }

        setState(diff)
    }

    const setNumberOf = ({ item }: { item: PickerOption<number> }) => {
        const diff = Object.assign({}, state);
        diff.every.numberOf = item.value;
        
        console.log('setNumberOf', diff)

        setState(diff)
    }

    const startRepeating = () => {
        if (!state.every) {
            const defaultState = Object.assign({}, DEFAULT_STATE);

            if (defaultState.every?.period == RecurringPeriod.Week) {
                const startDay = config.props.dateTimeRange().startDate;
                defaultState.every.days.push(moment(startDay).day());
            }

            setState(defaultState)
        }
    }

    const setWeekScope = () => {
        const diff = Object.assign({}, state);
        
        if (diff.every.period == RecurringPeriod.Month) {
            diff.every.weekScope = true;
            diff.every.dayScope = false;
        }

        setState(diff)
    }

    const setDayScope = () => {
        const diff = Object.assign({}, state);

        if (diff.every.period == RecurringPeriod.Month) {
            diff.every.weekScope = false;
            diff.every.dayScope = true;
        }

        setState(diff)
    }

    const setEndDate = (date: Date) => {
        console.log(date)

        const diff = Object.assign({}, state);

        diff.until = {
            date, 
            repititions: null
        };

        setState(diff)
    }

    const setEndRepititions = ({ item }: { item: PickerOption<number> }) => {
        const diff = Object.assign({}, state);

        diff.until = {
            date: null,
            repititions: item.value
        };

        setState(diff)
    }

    const repeatLabel = () => {
        const numberOf = state.every?.numberOf;

        if (!numberOf) {
            return 'Repeats every...'
        }

        // doing this way for localization reasons although 
        // im not sure how to handle subject/verb order changes etc.
        const period = state.every.period == RecurringPeriod.Day
            ? numberOf == 1 ? 'day' : 'days'
            : state.every.period == RecurringPeriod.Week
                ? numberOf == 1 ? 'week' : 'weeks'
                : numberOf == 1 ? 'month' : 'months'

        return `Repeats every ${numberOf} ${period}`
    }

    const nthDayOfMonthLabel = () => {
        const dayNum = moment(config.props.dateTimeRange().startDate).date();
        return dayToNthDayOfMonthLabel(dayNum)
    }

    const nthDayOfWeekLabel = () => {
        const dayNum = moment(config.props.dateTimeRange().startDate).day();
        return dayToNthDayOfWeekLabel(dayNum)
    }

    const repeatDaysLabel = (days: number[]) => {
        return daysToRecurringDaysLabel(days)
    }

    const endDateLabel = () => {
        return dateToEndDateLabel(state.until?.date);
    }
    const endRepititionsLabel = () => {
        return dateToEndRepititionsLabel(state.until?.repititions)
    }

    const selectEndDateOption = () => {
        const currDate = state.until?.date;

        // if first time choosing this option set sane default and open
        if (!currDate) {
            setEndDate(config.props.dateTimeRange().endDate)
            setEndOnDayOpen(true)
        } else {
            // toggle opening the picker
            setEndOnDayOpen(!endOnDayOpen)
        }
    }

    const selectEndRepititionOption = () => {
        const currReps = state.until?.repititions;

        // if first time choosing this option set sane default and open
        if (!currReps) {
            setEndRepititions({ item: { value: 1, label: '1' }})
            setEndOnRepititionOpen(true)
        } else {
            // toggle opening the picker
            setEndOnRepititionOpen(!endOnRepititionOpen)
        }
    }

    const toggleRepeatedDay = (day: number) => {
        const diff = Object.assign({}, state);

        if (diff.every.period == RecurringPeriod.Week) {
            const idx = diff.every.days.indexOf(day);

            if (idx == -1) {
                diff.every.days.push(day);
            } else {
                // have to have at least one day chosen to repeat on
                if (diff.every.days.length == 1) {
                    return;
                }

                diff.every.days.splice(idx, 1)
            }

            diff.every.days.sort();

            setState(diff)
        }
    }

    const doesNotRepeat = !state.every;
    const doesNotEnd = !state.until;
    const hasEndDate = !doesNotEnd && !!state.until.date;
    const hasEndRepititions = !doesNotEnd && !!state.until.repititions;

    const details = () => {
        const period = state.every?.period;

        const numberOfOptions = (period 
            ? period == RecurringPeriod.Month
                ? NUMBER_OF_MONTHS
                : period == RecurringPeriod.Week
                    ? NUMBER_OF_WEEKS
                    // "every day"
                    : NUMBER_OF_DAYS
            // default state
            : []).map(n => { 
                return { 
                    label: n.toString(), 
                    value: n 
                }
            });

        const initialPeriod = RECURRING_PERIODS.findIndex(p => p.value == period);
        const initialNumberOf = numberOfOptions.findIndex(n => n.value == state.every?.numberOf);

        return (
            <>
                <View style={{ flexDirection: 'row', justifyContent: 'center'}}>
                    <WheelPicker
                        initialSelectedIndex={initialNumberOf == -1 ? 0 : initialNumberOf}
                        items={numberOfOptions}
                        onChange={setNumberOf} />
                    <WheelPicker
                        style={{ width: 80 }}
                        initialSelectedIndex={initialPeriod == -1 ? 0 : initialPeriod}
                        items={RECURRING_PERIODS}
                        onChange={setRecurringPeriod} />
                </View>
                {period == RecurringPeriod.Day
                    ? null
                    :<View>
                        <View style={[styles.topDivider, styles.subSectionHeader]}></View>
                        { period == RecurringPeriod.Month
                            ? <>
                                <Row 
                                    label={nthDayOfMonthLabel()} 
                                    onPress={setDayScope} 
                                    selected={state.every?.dayScope}/>
                                <Row 
                                    label={nthDayOfWeekLabel()} 
                                    onPress={setWeekScope} 
                                    selected={state.every?.weekScope}/>
                            </>
                            : <>
                                <Row label={repeatDaysLabel(state.every.days)} onPress={() => console.log('day day')} />
                                <DayPicker days={state.every.days} toggleDay={toggleRepeatedDay}/>
                            </> 
                        }
                    </View>
                }
            </>
        )
    }
    
    return <>
        <BackButtonHeader  back={back} save={save} label={config.headerLabel} />
        <ScrollView>    
            <View style={styles.container}>
                <View style={styles.iconContainer}>
                        <IconButton
                            icon='refresh' 
                            color='#666'
                            size={20} 
                            style={{ margin: 0, padding: 0, width: 20 }}
                            />
                </View>
                
                <Row 
                    label={'Does not repeat'} 
                    onPress={clearRecurrance} 
                    selected={doesNotRepeat}/>

                <Row selected={!doesNotRepeat} label={repeatLabel()} onPress={startRepeating} />
                { !doesNotRepeat
                    ? details()
                    : null
                }
            </View>
            {
                !doesNotRepeat 
                    ? <View style={[styles.container, styles.topDivider]}>
                        <View style={styles.iconContainer}>
                            <IconButton
                                icon='arrow-right' //TODO: fix 
                                color='#666'
                                size={20} 
                                style={{ margin: 0, padding: 0, width: 20 }}
                                />
                        </View>

                        <Row 
                            label={'Does not end'} 
                            onPress={clearRecurranceEnd} 
                            selected={doesNotEnd}/>

                        <Row 
                            label={endDateLabel()} 
                            onPress={selectEndDateOption} 
                            selected={hasEndDate}/>
                        {
                            hasEndDate && endOnDayOpen
                                ? 
                                    <CalendarPicker
                                        onDateChange={setEndDate} 
                                        initialDate={state.until.date} />
                                
                                : null
                        }
                        <Row 
                            label={endRepititionsLabel()} 
                            onPress={selectEndRepititionOption} 
                            selected={hasEndRepititions}/>
                        {
                            hasEndRepititions && endOnRepititionOpen
                                ? <View style={{ flexDirection: 'row', justifyContent: 'center'}}>
                                    <WheelPicker
                                        initialSelectedIndex={state.until.repititions - 1}
                                        items={NUMBER_OF_REPITITIONS.map(r => ({ label: r, value: r }))}
                                        onChange={setEndRepititions} />
                                </View>
                                : null
                        }
                    </View>
                    : null
            }
        </ScrollView>
    </>
}

const Row = ({  selected, label, onPress }: { 
    selected?: boolean, 
    label: string, 
    onPress: () => void
}) => {
    return (
        <Pressable style={styles.section} onPress={onPress}>
            <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{label}</Text>
            { selected 
                ? <IconButton
                    icon='check' 
                    color='#666'
                    size={styles.selectIcon.width} 
                    style={styles.selectIcon} />
                : null
            }
        </Pressable>
    )
}

const DayPicker = ({ days, toggleDay }: { days: number[], toggleDay: (number) => void }) => {
    return <View style={styles.dayPickerContainer}>
        { 
            DAY_PICKER_OPTIONS.map(o => {
                const selected = days.includes(o.value)

                return (
                    <Pressable onPress={() => toggleDay(o.value)} style={[styles.dayPickerOption, selected ? styles.dayPickerOptionSelected : null]}>
                        <Text style={styles.dayPickerOptionLabel}>{o.label}</Text>
                    </Pressable>
                )
            })
        }
    </View>
}

export default RecurringTimePeriodInput

const styles = StyleSheet.create({
    label: { 
        // lineHeight: 60 
    },
    selectedLabel: {
        fontWeight: 'bold'
    },
    selectIcon: { 
        margin: 0, 
        padding: 0, 
        width: 30 
    },
    container: {
        position: 'relative',
        // paddingLeft: 60,
        // paddingRight: 20
    },
    iconContainer: {
        height: 60,
        width: 60,
        position: 'absolute', 
        // left: -20,
        justifyContent: 'center',
        alignContent: 'center',
        padding: 20
    },
    section: {
        minHeight: 60,
        position: "relative",
        flexDirection: 'row',
        justifyContent: 'space-between',
        // alignContent: 'flex-end'
        alignItems:'center',
        paddingLeft: 60,
        paddingRight: 20
    },
    topDivider: {
        borderTopColor: '#ccc',
        borderTopWidth: 1
    }, 
    subSectionHeader: {
        marginLeft: 60 
    },
    dayPickerContainer: {
        paddingLeft: 60,
        paddingRight: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignContent: 'center',
        marginBottom: 20
    },
    dayPickerOption: {
        height: 28,
        width: 28, 
        borderRadius: 20,
        backgroundColor: '#CCCACC',
        color: '#fff',
        justifyContent: 'center',
        alignItems: 'center'
    }, 
    dayPickerOptionLabel: {
        color: '#fff'
    },
    dayPickerOptionSelected: {
        backgroundColor: '#000',
    }
})