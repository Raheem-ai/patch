// 

import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { RecurringPeriod, RecurringTimeConstraints, RecurringTimePeriod } from "../../../../../common/models";
import { dateToDateYearString } from "../../../../../common/utils";
import CalendarPicker from "../../calendarPicker";
import WheelPicker, { PickerOption } from "../../wheelPicker";
import { SectionScreenViewProps } from "../types";
import BackButtonHeader from "./backButtonHeader";
import moment from 'moment'

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

const DEFAULT_STATE: RecurringTimeConstraints = {
    every: {
        period: RecurringPeriod.Week,
        numberOf: 1,
        days: []
    }
}

const RecurringTimePeriodInput = ({ back, config }: RecurringTimePeriodInputProps) => {
    const [state, setState] = useState<RecurringTimeConstraints>(Object.assign({}, config.val()));
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [endRepititionsOpen, setendRepititionsOpen] = useState(false);

    const save = () => {
        config.onSave?.(state);
        back();
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
            setState(DEFAULT_STATE)
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

    const setEndRepititions = (reps: number) => {
        const diff = Object.assign({}, state);

        diff.until.date = null;
        diff.until.repititions = reps;

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
        return `On the ${nthLabel(dayNum)} day of the month`
    }

    const nthDayOfWeekLabel = () => {
        const dayNum = moment(config.props.dateTimeRange().startDate).day();
        return `On the ${nthLabel(dayNum)} day of the week`
    }

    const endDateLabel = () => {
        const date = state.until?.date
            ? dateToDateYearString(state.until.date)
            : 'a date';

        return `Ends on ${date}`;
    }
    const endRepititionsLabel = () => {
        const reps = state.until?.repititions;
        const aNumberOf = reps || 'a number of'

        return `Ends after ${aNumberOf} ${reps == 1 ? 'repetition' : 'repetitions'}`
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
                    :<View style={styles.topDivider}>
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
                            // TODO: day specific week repitition
                            : <>
                                <Row label={'On Tuesday and Saturday'} onPress={() => console.log('day day')} />
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
                            onPress={() => setEndDate(config.props.dateTimeRange().endDate)} 
                            selected={hasEndDate}/>
                        {
                            hasEndDate
                                ? <CalendarPicker
                                    onDateChange={setEndDate} 
                                    intitalDate={state.until.date} />
                                : null
                        }
                        {/* TODO: choose from wheelpicker */}
                        <Row 
                            label={endRepititionsLabel()} 
                            onPress={() => console.log('Ends after a number of repetitions')} 
                            selected={hasEndRepititions}/>

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

const nthLabel = (n: number) => {
    const suffix = n % 10 == 1
            ? n < 10 || n > 20
                ? 'st' // 1st, 21st, 31st...
                : 'th' // 11th
            : n % 10 == 2
                ? n < 10 || n > 20
                    ? 'nd' // 2nd, 22nd, 32nd...
                    : 'th' // 12th
                : n % 10 == 3
                    ? n < 10 || n > 20
                        ? 'rd' // 3rd, 23rd, 33rd...
                        : 'th' // 13th
                    : 'th';
    return `${n}${suffix}`
}

export default RecurringTimePeriodInput

const styles = StyleSheet.create({
    label: { 
        lineHeight: 60 
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
        paddingLeft: 60,
        paddingRight: 20
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
        alignItems:'center'
    },
    topDivider: {
        borderTopColor: '#ccc',
        borderTopWidth: 1
    }
})