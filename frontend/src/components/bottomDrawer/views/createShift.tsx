import React from "react";
import { createShiftStore, alertStore, bottomDrawerStore } from "../../../stores/interfaces";
import { observable, runInAction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { PatchPermissions, Shift, WithoutDates } from "../../../../../common/models";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { View } from "react-native";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { ScrollView } from "react-native-gesture-handler";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";
import STRINGS from "../../../../../common/strings";
import TestIds from "../../../test/ids";
import { ICONS } from "../../../types";
import { CompoundFormInputConfig } from "../../forms/types";
import { dateToDateString, dateToDayOfWeekString } from "../../../../../common/utils";
import RecurringDateTimeRangeInputConfig from "../../forms/inputs/compound/recurringDateTimeRange";
import moment from "moment";

type Props = {}

@observer
class CreateShift extends React.Component<Props> {
    formInstance = observable.box<Form>(null);

    static minimizable = true;

    headerLabel = () => {
        return createShiftStore().title
                ? createShiftStore().title
                : 'Untitled shift/event';
    }

    headerIsPlaceholder = () => {
        // Maybe a more Javsacript way to do this?
        return createShiftStore().title
                ? false
                : true;
    }

    setRef = (formRef: Form) => {
        runInAction(() => {
            this.formInstance.set(formRef)
        })
    }

    formHomeScreen = observer(({
        renderHeader,
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {

        const headerConfig: BackButtonHeaderProps = {
            testID: TestIds.createShift.form,
            cancel: {
                handler: async () => {
                    createShiftStore().clear();
                },
            },
            save: {
                handler: async () => {
                    let createdShift: WithoutDates<Shift>;
        
                    try {
                        bottomDrawerStore().startSubmitting()
                        createdShift = await createShiftStore().createShift()
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const successMsg = STRINGS.SHIFTS.createdShiftSuccess(createdShift.series[0].title);

                    alertStore().toastSuccess(successMsg)
                    createShiftStore().clear()
                    bottomDrawerStore().hide()
                },
                label: STRINGS.SHIFTS.add,
                validator: () => {
                    return this.formInstance.get()?.isValid.get()
                }
            },
            bottomDrawerView: {
                minimizeLabel: this.headerLabel()
            },
        }

        return (
            <KeyboardAwareArea>
                <BackButtonHeader {...headerConfig} />
                <ScrollView testID={TestIds.createShift.form} showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(inputs()) }
                    </View>
                </ScrollView>
            </KeyboardAwareArea>
            
        )
    })

    formProps = (): FormProps => {

        return {
            headerLabel: this.headerLabel,
            headerIsPlaceholder: this.headerIsPlaceholder,
            homeScreen: this.formHomeScreen,
            testID: TestIds.createShift.form,
            inputs: [
                [
                    // Shift name
                    {
                        onChange: (title) => createShiftStore().title = title,
                        val: () => {
                            return createShiftStore().title
                        },
                        isValid: () => {
                            return !!createShiftStore().title
                        },
                        testID: TestIds.createShift.inputs.title,
                        name: 'title',
                        icon: ICONS.text,
                        placeholderLabel: () => STRINGS.SHIFTS.title,
                        type: 'TextInput',
                        required: true
                    },
                    // Description
                    {
                        onSave: (desc) => createShiftStore().description = desc,
                        val: () => {
                            return createShiftStore().description;
                        },
                        isValid: () => {
                            return true;
                        },
                        testID: TestIds.createShift.inputs.description,
                        name: 'description',
                        previewLabel: () => createShiftStore().description,
                        headerLabel: () => STRINGS.SHIFTS.description,
                        placeholderLabel: () => STRINGS.SHIFTS.description,
                        type: 'TextArea'
                    },
                ],
                RecurringDateTimeRangeInputConfig({
                    testID: TestIds.createShift.inputs.recurrence,
                    onChange: (recurringDateTimeRange) => {
                        createShiftStore().recurrence = recurringDateTimeRange;
                    },
                    val: () => {
                        return createShiftStore().recurrence
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
                // Positions
                {
                    onSave: (data) => {
                        createShiftStore().positions = data;
                    },
                    val: () => {
                        return createShiftStore().positions;
                    },
                    isValid: () => true,
                    headerLabel: () => STRINGS.SHIFTS.positions,
                    placeholderLabel: () => STRINGS.SHIFTS.positions,
                    icon: ICONS.accountMultiple,
                    props: {
                        editPermissions: [PatchPermissions.ShiftAdmin]
                    },
                    testID: TestIds.createShift.inputs.positions,
                    name: 'positions',
                    type: 'Positions'
                }
            ] as [
                [
                    InlineFormInputConfig<'TextInput'>,
                    ScreenFormInputConfig<'TextArea'>
                ],
                CompoundFormInputConfig<'RecurringDateTimeRange'>,
                ScreenFormInputConfig<'Positions'>,
            ]
        }
    }

    render() {
        return <Form sentry-label={TestIds.createShift.form} ref={this.setRef} {...this.formProps()}/>
    }
}

export default CreateShift
