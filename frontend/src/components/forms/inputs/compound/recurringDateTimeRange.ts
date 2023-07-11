import { DateTimeRange, RecurringTimeConstraints } from "../../../../../../common/models";
import { ICONS } from "../../../../types";
import { CompoundFormInputFactory, CompoundFormInputFactoryParams, InlineFormInputConfig, ScreenFormInputConfig } from "../../types";

const RecurringDateTimeRangeInputConfig: CompoundFormInputFactory<'RecurringDateTimeRange'> = (params: CompoundFormInputFactoryParams) => {
    const dateTimeVal = () => {
        const value = params.val();

        return {
            startDate: value.startDate,
            startTime: value.startTime,
            endDate: value.endDate,
            endTime: value.endTime
        }
    }

    const setDateTimeVal = (data: DateTimeRange) => {
        // TODO: Ensure that end date and end time are at least the same or after
        // start date and start time. Perhaps we automatically set the end date
        // to the later of its current value and the updated start date.
        // Ensure end time is after start time (or end date is after start date).
        const update = Object.assign({}, params.val(), data);
        params.onChange(update)
        params.props?.onDateTimeRangeChange?.(data)
    }

    const setRecurringTimeConstraintsVal = (data: RecurringTimeConstraints) => {
        const update = Object.assign({}, params.val(), data);
        params.onChange(update)
        params.props?.onRecurringTimeConstraintsChange?.(data)
    }

    const recurringTimeConstraintsVal = () => {
        const value = params.val();

        return {
            every: value.every,
            until: value.until
        }
    }
    
    return {
        inputs: () => {
            return [
                    {
                        onChange: setDateTimeVal,
                        val: dateTimeVal,
                        isValid: () => {
                            return params.props?.dateTimeRangeValid
                                ? params.props.dateTimeRangeValid(dateTimeVal())
                                : true;
                        },
                        name: `${params.name}-DTR`,
                        type: 'DateTimeRange',
                        disabled: params.disabled,
                        required: params.required,
                        icon: ICONS.calendar
                    },
                    {
                        onSave: setRecurringTimeConstraintsVal,
                        val: recurringTimeConstraintsVal,
                        isValid: () => {
                            return params.props?.recurringTimeConstraintsValid
                                ? params.props.recurringTimeConstraintsValid(recurringTimeConstraintsVal())
                                : true;
                        },
                        props: {
                            dateTimeRange: dateTimeVal,
                            updateDateTimeRange: setDateTimeVal,
                            updateStartDatePromptMessage: params.props.updateStartDatePromptMessage,
                            updateStartDatePromptTitle: params.props.updateStartDatePromptTitle
                        },
                        name: `${params.name}-RTC`,
                        headerLabel: () => 'Repeat',
                        type: 'RecurringTimePeriod',
                        disabled: params.disabled,
                        required: params.required,
                        icon: ICONS.refresh
                    }
            ] as [
                    InlineFormInputConfig<'DateTimeRange'>, 
                    ScreenFormInputConfig<'RecurringTimePeriod'>
            ]
        },
        type: 'RecurringDateTimeRange',
    }
}

export default RecurringDateTimeRangeInputConfig;