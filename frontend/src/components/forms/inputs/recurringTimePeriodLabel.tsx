import { runInAction } from "mobx"
import { observer } from "mobx-react"
import React from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { IconButton, Text } from "react-native-paper"
import { RecurringPeriod } from "../../../../../common/models"
import { dateToEndDateLabel, dateToEndRepititionsLabel, daysToRecurringDaysLabel, dayToNthDayOfMonthLabel, dayToNthDayOfWeekLabel } from "../../../../../common/utils"
import { SectionLabelViewProps } from "../types"
import moment from 'moment'

const RecurringTimePeriodLabel = observer(({ config, expand }: SectionLabelViewProps<'RecurringTimePeriod'>) => {

    const onPress = () => {
        if (config.disabled) {
            return
        }
        
        expand?.()
    }

    const doesntRepeatText = () => {
        return `Does not repeat`
    }

    const repeatsText = () => {
        const period = config.val().every.period;
        const numberOf = config.val().every.numberOf;

        const pluralPeriod = period == RecurringPeriod.Day
            ? 'days'
            : period == RecurringPeriod.Week 
                ? 'weeks'
                : 'months';
        
        const everyPeriod = period == RecurringPeriod.Day
            ? 'daily'
            : period == RecurringPeriod.Week 
                ? 'weekly'
                : 'monthly';

        return numberOf > 1
                ? `Repeats every ${numberOf} ${pluralPeriod}`
                : `Repeats ${everyPeriod}`
    }

    const repeatsEveryText = () => {
        const val = config.val();

        if (val.every.period == RecurringPeriod.Day) {
            return null
        }

        if (val.every.period == RecurringPeriod.Week) {
            return daysToRecurringDaysLabel(val.every.days);
        } else {
            const startDay = moment(config.props.dateTimeRange().startDate);

            if (val.every.weekScope) {
                return dayToNthDayOfWeekLabel(startDay.day())
            } else if (val.every.dayScope) {
                return dayToNthDayOfMonthLabel(startDay.date())
            } else {
                return null // shouldn't happen
            }
        }
    }

    const endsAfterText = () => {
        const val = config.val()

        if (val.until?.date) {
            return dateToEndDateLabel(val.until.date)
        }

        if (val.until?.repititions) {
            return dateToEndRepititionsLabel(val.until.repititions)
        }

        return 'Does not end';
    }

    const rows: JSX.Element[] = [];

    if (!config.val() || !config.val().every) {
        rows.push(<Row text={doesntRepeatText()}/>)
    } else {
        rows.push(<Row text={repeatsText()}/>)

        if (config.val().every.period != RecurringPeriod.Day) {
            rows.push(<Row text={repeatsEveryText()}/>)
        }

        rows.push(<Row text={endsAfterText()}/>)
    }

    return (
        <Pressable onPress={onPress} style={[{ minHeight: 60, position: 'relative', justifyContent: 'center' }]}>
            <View style={{ paddingLeft: 0, padding: 20, paddingBottom: 0 }}>
                {rows}
            </View>
        </Pressable>
    )
})

export default RecurringTimePeriodLabel;

const Row = ({ text }: { text: string }) => {
    return <View style={styles.row}>
        <Text style={styles.label}>{text}</Text>
    </View>
}

const styles = StyleSheet.create({
    label: {
        color: '#000',
        fontSize: 16
    },
    row: {
        marginBottom: 20
    }
})