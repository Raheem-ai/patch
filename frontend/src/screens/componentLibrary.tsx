import React from "react";
import { FormInputConfig, NavigationFormInputConfig, ScreenFormInputConfig } from "../components/forms/types";
import Form, { FormProps } from '../components/forms/form';
import { ScreenProps } from "../types";
import { Pressable, View } from "react-native";
import { IObservableValue, observable } from "mobx";
import { AddressableLocation, CategorizedItem, PatchPermissions, Position, RecurringDateTimeRange } from "../../../common/models";
import { dateToDateString, dateToDayOfWeekString } from "../../../common/utils";
import RecurringDateTimeRangeInputConfig from "../components/forms/inputs/compound/recurringDateTimeRange";
import moment from 'moment'
import { exp } from "react-native-reanimated";
import { Text } from "react-native-paper";
import DescriptiveNavigationLabel from "../components/forms/inputs/descriptiveNavigationLabel";
import { manageAttributesStore, manageTagsStore, organizationStore } from "../stores/interfaces";
import { TagsListInput } from "../components/forms/inputs/defaults/defaultTagListInputConfig";
import { AttributesListInput } from "../components/forms/inputs/defaults/defaultAttributeListInputConfig";

type Props = ScreenProps<'ComponentLib'>;

type Library = Demo[];

type Demo<State = any> = {
    name: string,
    description: string,
    state: State,
    inputs: (state: State) => FormProps['inputs'],
    icon?: string
}

const lib: Library = [
    {
        name: 'Recurring DateTime Range',
        description: 'Example of a CompoundInput that wraps both an InlineComponent and a ScreenComponent',
        state: observable.box<RecurringDateTimeRange>({
            startDate: moment().hour(22).minutes(5).toDate(), // Today @ 10:05pm 
            endDate: moment().hour(22).minutes(5).add(2, 'hours').toDate(), // Tomorrow @ 12:05am 
        }),
        icon: 'clock-outline',
        inputs: (state) => [RecurringDateTimeRangeInputConfig({
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
        })]
    },
    {
        name: 'Grouped Components',
        description: '',
        icon: 'group',
        state: observable.box<{
            recurringDateTimeRange: RecurringDateTimeRange,
            name: string,
            location: AddressableLocation
        }>({
            recurringDateTimeRange: {
                startDate: moment().hour(22).minutes(5).toDate(), // Today @ 10:05pm 
                endDate: moment().hour(22).minutes(5).add(2, 'hours').toDate(), // Tomorrow @ 12:05am 
            },
            name: '',
            location: null
        }),
        inputs: (state) => [
            [
                RecurringDateTimeRangeInputConfig({
                    onChange: (recurringDateTimeRange) => {
                        state.set(Object.assign({}, state.get(), { recurringDateTimeRange }))
                    },
                    val: () => {
                        return state.get().recurringDateTimeRange;
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
                }),
                {
                    onSave: (location) => {
                        state.set(Object.assign({}, state.get(), { location }))
                    },
                    val: () => {
                        return state.get().location;
                    },
                    isValid: () => {
                        return true
                    },
                    name: 'location',
                    previewLabel: () => state.get().location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                {
                    onChange: (name) => {
                        state.set(Object.assign({}, state.get(), { name }))
                    },
                    val: () => {
                        return state.get().name
                    },
                    isValid: () => {
                        return true
                    },
                    name: 'name',
                    placeholderLabel: () => 'Name',
                    type: 'TextInput',
                    required: true
                }
            ]
        ]
    },
    {
        name: 'Categorized Item List',
        description: 'basis for attributes/tags selection/management',
        state: observable.box<{ attributes: CategorizedItem[], tags: CategorizedItem[]}>({ attributes: [], tags: [] }),
        icon: 'tag',
        inputs: (state) => [[
            AttributesListInput({
                onSave: (items) => {
                    state.set(Object.assign({}, state.get(), { attributes: items }))
                },
                val: () => {
                    return state.get().attributes;
                },
                isValid: () => {
                    return true
                },
                icon: 'tag-heart',
                name: 'attributes'
            }), 
            TagsListInput({
                onSave: (items) => {
                    state.set(Object.assign({}, state.get(), { tags: items }))
                },
                val: () => {
                    return state.get().tags;
                },
                isValid: () => {
                    return true
                },
                name: 'tags'
            })
        ]]
    },
    {
        name: 'Positions input',
        description: '',
        state: observable.box<Position[]>([]),
        icon: 'account-multiple',
        inputs: (state: IObservableValue<Position[]>) => [{
            onSave: (data) => {
                console.log(data)
                state.set(data)
            },
            val: () => {
                return state.get();
            },
            isValid: () => true,
            headerLabel: () => 'People needed',
            placeholderLabel: () => 'People needed',
            icon: 'account-multiple',
            props: {},
            name: 'positions',
            type: 'Positions'
        } as ScreenFormInputConfig<'Positions'>]
    },
]


const ComponentLibrary = (props: Props) => {

    const nestedForms = lib.map(item => {
        const inputs = item.inputs(item.state);

        const label: NavigationFormInputConfig['label'] = !item.description
            ? item.name
            : ({ expand }) => {
                return (
                    <DescriptiveNavigationLabel 
                        expand={expand} 
                        name={item.name} 
                        description={item.description} />
                )
            }

            

        const navigationInputConfig: NavigationFormInputConfig = {
            name: item.name,
            label: label,
            icon: item.icon,
            screen: ({ back }) => {
                return <Form headerLabel={item.name} inputs={inputs} submit={{ label: 'Done', handler: async () => back() }}/>
            }
        }

        return navigationInputConfig
    });

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Form inputs={nestedForms} headerLabel={'Demos'}/>
        </View>
    )
    
}

export default ComponentLibrary;
