import React from "react";
import { FormInputConfig } from "../components/forms/types";
import Form from '../components/forms/form';
import { ScreenProps } from "../types";
import { View } from "react-native";
import { observable } from "mobx";
import { RecurringDateTimeRange } from "../../../common/models";
import { dateToDateString, dateToDayOfWeekString } from "../../../common/utils";
import RecurringDateTimeRangeInputConfig from "../components/forms/inputs/compound/recurringDateTimeRange";
import moment from 'moment'

type Props = ScreenProps<'ComponentLib'>;

type Library = Demo[];

type Demo<State = any> = {
    name: string,
    description: string,
    state: State,
    inputConfig: (state: State) => FormInputConfig
}

const lib: Library = [
    {
        name: 'Recurring DateTime Range',
        description: '',
        state: observable.box<RecurringDateTimeRange>({
            startDate: moment().hour(22).minutes(5).toDate(), // Today @ 10:05pm 
            endDate: moment().hour(22).minutes(5).add(2, 'hours').toDate(), // Tomorrow @ 12:05am 
        }),
        inputConfig: (state) => RecurringDateTimeRangeInputConfig({
            onChange: (data) => {
                state.set(data)
            },
            val: () => {
                return state.get();
            },
            props: {
                updateStartDatePromptMessage: (from: Date, to: Date) => {
                    return `Do you want to move the next scheduled shift from ${dateToDateString(from)} to ${dateToDateString(to)}?`
                },
                updateStartDatePromptTitle: (from: Date, to: Date) => {
                    return `Move next shift to ${dateToDayOfWeekString(to)}?`
                }
            },
            name: 'schedule'
        })
    }
]


const ComponentLibrary = (props: Props) => {

    const items = lib.map(item => {
        const inputs = [item.inputConfig(item.state)];

        return (
            <Form headerLabel={item.name} inputs={inputs} />
        )
    });

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            { items }
        </View>
    )
    
}

export default ComponentLibrary;
