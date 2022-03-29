import { ComponentType } from "react"
import { AddressableLocation, DateTimeRange, RecurringDateTimeRange, RecurringTimeConstraints } from "../../../../common/models"

export type SectionInlineViewProps<Type extends InlineFormInputType = InlineFormInputType> = {
    config: InlineFormInputConfig<Type>,
    expand?: () => void
}

export type SectionLabelViewProps<Type extends ScreenFormInputType = ScreenFormInputType> = {
    config: ScreenFormInputConfig<Type>,
    expand?: () => void
}

export type SectionScreenViewProps<Type extends ScreenFormInputType = ScreenFormInputType> = {
    back: () => void,
    config: ScreenFormInputConfig<Type>
}

export type ScreenFormInputOptions = { 
    'TextArea': {
        props: {},
        type: string
    },
    'Map': {
        props: {},
        type: AddressableLocation
    },
    'RecurringTimePeriod': {
        props: {
            dateTimeRange: () => DateTimeRange
        },
        type: RecurringTimeConstraints
    },
    'List': {
        props: {
            options: any[]
            optionToPreviewLabel: (opt) => string
            optionToListLabel?: (opt) => string
            multiSelect?: boolean
        },
        type: any[]
    },
    'TagList': {
        props: ScreenFormInputOptions['List']['props'] & {
            onTagDeleted?: (idx: number, val: any) => void
            dark?: boolean
        },
        type: any[]
    },
    'NestedList': {
        props: ScreenFormInputOptions['List']['props'] & {
            categories: any[],
            optionsFromCategory: (cat: any) => any[]
            categoryToLabel: (opt) => string
        },
        type: any[]
    },
    'NestedTagList': {
        props: ScreenFormInputOptions['NestedList']['props'] & {
            onTagDeleted?: (idx: number, val: any) => void
            dark?: boolean
        },
        type: any[]
    }
}

export type InlineFormInputOptions = { 
    'DateTimeRange': {
        props: {},
        type: DateTimeRange
    },
    'TextInput': {
        props: {},
        type: string
    }
}

export type CompoundFormInputOptions = {
    'RecurringDateTimeRange': {
        props: {
            dateTimeRangeValid?: (dateTimeRange: DateTimeRange) => boolean,
            recurringTimeConstraintsValid?: (constraints: RecurringTimeConstraints) => boolean
        }
        type: RecurringDateTimeRange
    }
}

export type FormInputConfig = InlineFormInputConfig | ScreenFormInputConfig | CompoundFormInputConfig;

export type StandAloneFormInputConfig = InlineFormInputConfig | ScreenFormInputConfig;

export type InlineFormInputConfig<Type extends InlineFormInputType = InlineFormInputType, Val extends InlineFormInputOptions[Type]['type'] = InlineFormInputOptions[Type]['type']> = {
    onChange(val: Val): void
    val(): Val
    isValid(): boolean
    placeholderLabel?: string | (() => string)
    // defines what component it will get mapped to
    type: Type
    props?: InlineFormInputOptions[Type]['props']
} & BaseFormInputConfig;

export type ScreenFormInputConfig<Type extends ScreenFormInputType = ScreenFormInputType, Val extends ScreenFormInputOptions[Type]['type'] = ScreenFormInputOptions[Type]['type']> = {
    /**
     *  for screen fields that hold their own temp internal state until you save 
     * */
    onSave(val: Val): void
    val(): Val
    isValid(): boolean
    headerLabel: string | (() => string)
    // defines what component it will get mapped to
    type: Type

    // these two only matter when you don't have an inline input or a screen input
    // with a label component in the FormInputViewMap...TODO: make this tighter
    previewLabel?: string | (() => string)
    placeholderLabel?: string | (() => string)
    
    // TODO: should this be optional?!
    props?: ScreenFormInputOptions[Type]['props']
} & BaseFormInputConfig;

// only need the inputs this encapsulates, the string type for typings, and the props for input specific
// configuration as this is just a data wrapper around other existing components
export type CompoundFormInputConfig<Type extends CompoundFormInputType = CompoundFormInputType, Val extends CompoundFormInputOptions[Type]['type'] = CompoundFormInputOptions[Type]['type']> = {
    inputs(): StandAloneFormInputConfig[]
    type: Type
    props?: CompoundFormInputOptions[Type]['props']
};

// Each CompoundFormInput should have a wrapper that handles the wiring logic 
// this is what gets passed to that wrapper
export type CompoundFormInputFactoryParams<Type extends CompoundFormInputType = CompoundFormInputType, Val extends CompoundFormInputOptions[Type]['type'] = CompoundFormInputOptions[Type]['type']> = {
    onChange(val: Val): void
    val(): Val
} & BaseFormInputConfig & Pick<CompoundFormInputConfig<Type, Val>, 'props'>

// instead of exporting an input component we export a factory with a similar config interface
export type CompoundFormInputFactory<Type extends CompoundFormInputType> = (params: CompoundFormInputFactoryParams<Type>) => CompoundFormInputConfig<Type>;

type BaseFormInputConfig = {
    name: string
    disabled?: boolean
    required?: boolean
}

export type ScreenFormInputType = keyof ScreenFormInputOptions
export type InlineFormInputType = keyof InlineFormInputOptions
export type CompoundFormInputType = keyof CompoundFormInputOptions

export type InlineFormInputViewConfig<InputType extends InlineFormInputType = InlineFormInputType> = {
    inlineComponent: ComponentType<SectionInlineViewProps<InputType>>
}

export type ScreenFormInputViewConfig<InputType extends ScreenFormInputType = ScreenFormInputType> = {
    labelComponent?: ComponentType<SectionLabelViewProps<InputType>>,
    screenComponent: ComponentType<SectionScreenViewProps<InputType>>
}


export type FormInputViewMap = { 
    [key in ScreenFormInputType]?: ScreenFormInputViewConfig<key>
} & {
    [key in InlineFormInputType]?: InlineFormInputViewConfig<key>
}