import React from "react";
import { alertStore, bottomDrawerStore, shiftStore, editShiftStore, PromptAction } from "../../../stores/interfaces";
import { observable, runInAction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { DateTimeRange, PatchPermissions, RecurringTimeConstraints, Shift, WithoutDates } from "../../../../../common/models";
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
class EditShift extends React.Component<Props> {
    formInstance = observable.box<Form>(null);

    static minimizable = true;

    static onShow() {
        editShiftStore().loadShift(shiftStore().currentShiftOccurrenceId);
    }

    headerLabel = () => {
        return editShiftStore().title;
    }

    headerIsPlaceholder = () => {
        // Maybe a more Javsacript way to do this?
        return editShiftStore().title
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
            testID: TestIds.editShift.form,
            cancel: {
                handler: async () => {
                    editShiftStore().clear();
                },
            },
            save: {
                handler: async () => {
                    alertStore().showPrompt({
                        title:  "Save changes to shift",
                        message: "Do you want to save changes to all or just this shift?",
                        actions: this.getFormActions()
                    })
                },
                label: STRINGS.SHIFTS.edit,
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
                <ScrollView testID={TestIds.editShift.form} showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(inputs()) }
                    </View>
                </ScrollView>
            </KeyboardAwareArea>
            
        )
    })

    getFormActions = (): [PromptAction] | [PromptAction, PromptAction] => {
        // TODO: Update the prompt form to be able to accept three prompt actions:
        // 1) "only this" 2) "all" 3) "this and all future"
        const actions: [PromptAction] | [PromptAction, PromptAction] = [
            {
                label: "all",
                onPress: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()
                        await editShiftStore().editAllShifts();
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const successMsg = STRINGS.SHIFTS.updatedShiftDefinitionSuccess(editShiftStore().title);

                    alertStore().toastSuccess(successMsg)
                    editShiftStore().clear()
                    bottomDrawerStore().hide()
                },
                confirming: true
            },
            /*
            {
                label: "this and all future",
                onPress: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()
                        await editShiftStore().editThisAndFutureShifts();
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const successMsg = STRINGS.SHIFTS.updatedShiftDefinitionSuccess(editShiftStore().title);

                    alertStore().toastSuccess(successMsg)
                    editShiftStore().clear()
                    bottomDrawerStore().hide()
                },
                confirming: true
            }
            */
        ];

        if (editShiftStore().canUpdateSingleOccurrence()) {
            actions.push({
                label: "only this",
                onPress: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()
                        await editShiftStore().editShiftOccurrence();
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const successMsg = STRINGS.SHIFTS.updatedShiftOccurrenceSuccess(editShiftStore().title);

                    alertStore().toastSuccess(successMsg)
                    editShiftStore().clear()
                    bottomDrawerStore().hide()
                },
                confirming: true
            })
        }

        return actions;
    }

    formProps = (): FormProps => {

        return {
            headerLabel: this.headerLabel,
            headerIsPlaceholder: this.headerIsPlaceholder,
            homeScreen: this.formHomeScreen,
            testID: TestIds.editShift.form,
            inputs: [
                [
                    // Shift name
                    {
                        onChange: (title) => editShiftStore().title = title,
                        val: () => {
                            return editShiftStore().title
                        },
                        isValid: () => {
                            return !!editShiftStore().title;
                        },
                        testID: TestIds.editShift.inputs.title,
                        name: 'title',
                        icon: ICONS.text,
                        placeholderLabel: () => STRINGS.SHIFTS.title,
                        type: 'TextInput',
                        required: true
                    },
                    // Description
                    {
                        onSave: (desc) => editShiftStore().description = desc,
                        val: () => {
                            return editShiftStore().description;
                        },
                        isValid: () => {
                            return true;
                        },
                        testID: TestIds.editShift.inputs.description,
                        name: 'description',
                        previewLabel: () => editShiftStore().description,
                        headerLabel: () => STRINGS.SHIFTS.description,
                        placeholderLabel: () => STRINGS.SHIFTS.description,
                        type: 'TextArea'
                    },
                ],
                RecurringDateTimeRangeInputConfig({
                    testID: TestIds.editShift.inputs.recurrence,
                    onChange: () => {},
                    val: () => {
                        return {
                            startDate: editShiftStore().dateTimeRange.startDate,
                            startTime: editShiftStore().dateTimeRange.startTime,
                            endDate: editShiftStore().dateTimeRange.endDate,
                            endTime: editShiftStore().dateTimeRange.endTime,
                            every: editShiftStore().recurringTimeConstraints.every,
                            until: editShiftStore().recurringTimeConstraints.until
                        }
                    },
                    props: {
                        updateStartDatePromptMessage: (from: Date, to: Date) => {
                            return `Do you want to move the next scheduled shift from ${dateToDateString(from)} to ${dateToDateString(to)}?`
                        },
                        updateStartDatePromptTitle: (from: Date, to: Date) => {
                            return `Move next shift to ${dateToDayOfWeekString(to)}?`
                        },
                        onDateTimeRangeChange: (dateTimeRange: DateTimeRange) => {
                            console.log('dateTimeRange is changing!');
                            editShiftStore().dateTimeRange = dateTimeRange;
                        },
                        onRecurringTimeConstraintsChange: (constraints: RecurringTimeConstraints) => {
                            console.log('recurrence is changing!');
                            editShiftStore().recurringTimeConstraints = constraints;
                        },
                    },
                    name: 'schedule'
                }),
                // Positions
                {
                    onSave: (_, diff) => {
                        editShiftStore().savePositionUpdates(diff);
                    },
                    val: () => {
                        return editShiftStore().positions;
                    },
                    isValid: () => true,
                    headerLabel: () => STRINGS.SHIFTS.positions,
                    placeholderLabel: () => STRINGS.SHIFTS.positions,
                    icon: ICONS.accountMultiple,
                    props: {
                        editPermissions: [PatchPermissions.ShiftAdmin]
                    },
                    testID: TestIds.editShift.inputs.positions,
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
        return <Form sentry-label={TestIds.editShift.form} ref={this.setRef} {...this.formProps()}/>
    }
}

export default EditShift
