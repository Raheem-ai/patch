import { observer } from "mobx-react";
import React from "react";
import { FormInputConfig } from "../components/forms/types";
import Form from '../components/forms/form';
import { ScreenProps } from "../types";
import { View } from "react-native";
import { observable } from "mobx";
import { RecurringDateTimeRange } from "../../../common/models";
import { dateToDateString, dateToDayOfWeekString } from "../../../common/utils";
import RecurringDateTimeRangeInputConfig from "../components/forms/inputs/compound/recurringDateTimeRange";
import { Text } from "react-native-paper";


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
            startDate: new Date('03/12/2022 22:05'),
            endDate: new Date('03/13/2022 00:05')
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
