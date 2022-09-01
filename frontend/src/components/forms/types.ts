import { ComponentType } from "react"
import { KeyboardType, StyleProp, ViewStyle } from "react-native";
import { AddressableLocation, CategorizedItem, Category, DateTimeRange, PatchPermissionGroups, PatchPermissions, Position, RecurringDateTimeRange, RecurringTimeConstraints } from "../../../../common/models"
import { IEditCategorizedItemStore, ISelectCategorizedItemStore } from "../../stores/interfaces";

export type Grouped<T> = T | T[];

export type SectionInlineViewProps<Type extends InlineFormInputType = InlineFormInputType> = {
    config: InlineFormInputConfig<Type>
}

export type SectionLabelViewProps<Type extends ScreenFormInputType = ScreenFormInputType> = {
    config: ScreenFormInputConfig<Type>,
    expand: (params?: any) => void
}

export type SectionScreenViewProps<Type extends ScreenFormInputType = ScreenFormInputType> = {
    // pass if save/cancel should go back
    back: () => void,
    // pass if you want to replace the default header
    config: ScreenFormInputConfig<Type>,
    // TODO: tie type to ScreenFormInputOptions but make it optional and default to any
    paramsFromLabel?: any
}

// navigation input config decides completely how to render the label
// all it needs from form implementation is a way to switch screens
export type SectionNavigationLabelViewProps = {
    expand: () => void
}

// navigation input config decides completely how to render the screen component
// all it needs from form implementation is a way to go back to the form's home screen
export type SectionNavigationScreenViewProps = {
    back: () => void
}

export type ScreenFormInputOptions = { 
    'TextArea': {
        props: {
            maxChar?: number
        },
        type: string
    },
    'Map': {
        props: {},
        type: AddressableLocation
    },
    'RecurringTimePeriod': {
        props: {
            dateTimeRange: () => DateTimeRange,
            updateDateTimeRange: (dtr: DateTimeRange) => void,
            updateStartDatePromptMessage: (from: Date, to: Date) => string
            updateStartDatePromptTitle: (from: Date, to: Date) => string
        },
        type: RecurringTimeConstraints
    },
    'List': {
        props: InlineFormInputOptions['InlineList']['props'],
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
    },
    'PermissionGroupList': {
        props: {
            
        },
        type: PatchPermissionGroups[]
    },
    'CategorizedItemList': {
        props: {
            // needs to be a function so consumers update correctly
            definedCategories: () => Map<string, Category>,
            editConfig?: {
                // we have to filter here as CategorizedItem definitions can be deleted before they are unselected from the list
                filterRemovedItems: (items: CategorizedItem[]) => CategorizedItem[]
                editHeaderLabel: string,
                addCategoryPlaceholderLabel: string,
                addItemPlaceholderLabel: string,
                onSaveToastLabel: string,
                editStore: IEditCategorizedItemStore,
                editPermissions: PatchPermissions[]
            },
            onItemDeleted?: (idx: number, val: any) => void
            dark?: boolean
            setDefaultClosed?: boolean
        }, 
        type: CategorizedItem[]
    }, 
    'RoleList': {
        props: {
            onlyAddative?: boolean
            multiSelect?: boolean
            hideAnyone?: boolean
            onItemDeleted?: (idx: number, val: any) => void
        },
        type: string[]
    },
    'Positions' : {
        props: {
            editPermissions: PatchPermissions[]
        },
        type: Position[]
    }
}

export type InlineFormInputOptions = { 
    'DateTimeRange': {
        props: {},
        type: DateTimeRange
    },
    'TextInput': {
        props: {
            inputType?: KeyboardType
            password?: boolean 
        },
        type: string
    }
    'Switch': {
        props: {
            label: string | (() => string)
        },
        type: boolean
    },
    'InlineList': {
        props: {
            options: any[]
            optionToPreviewLabel: (opt) => string
            optionToListLabel?: (opt) => string
            multiSelect?: boolean,
            onlyAddative?: boolean
        },
        type: any[]
    },
    'Slider': {
        props: {
            maxBeforeOrMore: number
        }, 
        type: {
            min: number,
            max: number
        }
    }
}

export type CompoundFormInputOptions = {
    'RecurringDateTimeRange': {
        props: {
            updateStartDatePromptMessage: (from: Date, to: Date) => void,
            updateStartDatePromptTitle: (from: Date, to: Date) => void,
            dateTimeRangeValid?: (dateTimeRange: DateTimeRange) => boolean,
            recurringTimeConstraintsValid?: (constraints: RecurringTimeConstraints) => boolean
        }
        type: RecurringDateTimeRange
    }
}

// catch all type that gets passed to form for input configuration
export type FormInputConfig = CompoundFormInputConfig | StandAloneFormInputConfig;

// form input configuration types that correspond to at least 1 visual component on the form homepage
export type StandAloneFormInputConfig = ValidatableFormInputConfig | NavigationFormInputConfig;

// form input configuration that both has a visual component on the home page and manages data
// that might need to be validated
export type ValidatableFormInputConfig = InlineFormInputConfig | ScreenFormInputConfig

// much simpler because it doesn't deal with data at all...it only ties into
// the navigation in forms
export type NavigationFormInputConfig = {
    label: ((props: SectionNavigationLabelViewProps) => JSX.Element) | string,
    screen: (props: SectionNavigationScreenViewProps) => JSX.Element

    labelContainerStyle?: StyleProp<ViewStyle>
    expandOverride?: (expand: () => void) => void
    expandIcon?: string | (() => string)
    // need 'name' for a screenId and 'disabled' in case the label is a string
    // so the consumer doesn't have control over the disabled lable visual component
} & Pick<BaseFormInputConfig, 'name' | 'disabled' | 'icon'>; 

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
    onCancel?(): void
    val(): Val

    // TODO: this should be isValid(currentVal: Val): boolean as the val()
    // passed in is only relevent for intial state
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
} & Pick<BaseFormInputConfig, 'name' | 'disabled' | 'required'> & Pick<CompoundFormInputConfig<Type, Val>, 'props'>

// instead of exporting an input component we export a factory with a similar config interface
export type CompoundFormInputFactory<Type extends CompoundFormInputType> = (params: CompoundFormInputFactoryParams<Type>) => CompoundFormInputConfig<Type>;

export type AdHocScreenConfig = {
    name: string,
    screen: (props: { back: () => void }) => JSX.Element
}

type BaseFormInputConfig = {
    name: string
    disabled?: boolean
    required?: boolean
    icon?: string
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
    // tell label component container not to navigate to screen 
    // component if areas outside the label component are pressed
    disableAutoExpandFromLabel?: boolean
    hideExpandArrow?: boolean
}


export type FormInputViewMap = { 
    [key in ScreenFormInputType]?: ScreenFormInputViewConfig<key>
} & {
    [key in InlineFormInputType]?: InlineFormInputViewConfig<key>
}