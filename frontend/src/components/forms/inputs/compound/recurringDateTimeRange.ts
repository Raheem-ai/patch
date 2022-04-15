import { DateTimeRange, RecurringTimeConstraints } from "../../../../../../common/models";
import { CompoundFormInputFactory, CompoundFormInputFactoryParams, InlineFormInputConfig, ScreenFormInputConfig } from "../../types";

const RecurringDateTimeRangeInputConfig: CompoundFormInputFactory<'RecurringDateTimeRange'> = (params: CompoundFormInputFactoryParams) => {
    const dateTimeVal = () => {
        const value = params.val();

        return {
            startDate: value.startDate,
            endDate: value.endDate
        }
    }

    const setDateTimeVal = (data: DateTimeRange) => {
        const update = Object.assign({}, params.val(), data);
        params.onChange(update)
    }

    const setRecurringTimeConstraintsVal = (data: RecurringTimeConstraints) => {
        const update = Object.assign({}, params.val(), data);
        params.onChange(update)
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
            return [{
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
                icon: 'clock-outline'
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
                icon: 'refresh'
            }] as [ 
                InlineFormInputConfig<'DateTimeRange'>, 
                ScreenFormInputConfig<'RecurringTimePeriod'>
            ]
        },
        type: 'RecurringDateTimeRange',
    }
}

export default RecurringDateTimeRangeInputConfig;