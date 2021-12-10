import { ComponentType } from "react"
import { AddressableLocation } from "../../../../common/models"

export type SectionViewProps<Type extends FormInputType = FormInputType> = {
    config: FormInputConfig<Type>,
    expand?: () => void
}

export type SectionScreenProps<Type extends FormInputType = FormInputType> = {
    back: () => void,
    config: FormInputConfig<Type>
}

export type FormInputOptions = { 
    'TextInput': {
        props: {},
        type: string
    },
    'TextArea': {
        props: {},
        type: string
    },
    'Map': {
        props: {},
        type: AddressableLocation
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
        props: FormInputOptions['List']['props'] & {
            onTagDeleted?: (idx: number, val: any) => void
            dark?: boolean
        },
        type: any[]
    },
    'NestedList': {
        props: {
            categories: any[],
            optionsFromCategory: (cat: any) => any[]
            optionToPreviewLabel: (opt) => string
            optionToListLabel?: (opt) => string
            categoryToLabel: (opt) => string
            multiSelect?: boolean
        },
        type: any[]
    },
    'NestedTagList': {
        props: FormInputOptions['NestedList']['props'] & {
            onTagDeleted?: (idx: number, val: any) => void
            dark?: boolean
        },
        type: any[]
    }
}

// TODO: make this type tighter so screen fields and inline fields are separate as they act differently
// and have different patterns

// TODO: figure out how to separate props for a screen view vs label view vs inline view for better
// type safety between combinations of the three ie. list vs nested list + tag label views
export type FormInputConfig<Type extends FormInputType = FormInputType, Val extends FormInputOptions[Type]['type'] = FormInputOptions[Type]['type']> = {
    onSave?(val: Val): void // for screen fields that hold their own temp internal state until you save 
    onChange?(val: Val): void// for controlled form fields
    val(): Val
    isValid(): boolean
    name: string
    previewLabel: string | (() => string)
    headerLabel: string | (() => string)
    // defines what component it will get mapped to
    type: Type
    props?: FormInputOptions[Type]['props']
    disabled?: boolean
    required?: boolean
}

export type FormInputType = keyof FormInputOptions

export type FormInputViewConfig<InputType extends FormInputType = FormInputType> = {
    labelComponent?: ComponentType<SectionViewProps<InputType>>,
    inlineComponent?: ComponentType<SectionViewProps<InputType>>,
    screenComponent?: ComponentType<SectionScreenProps<InputType>>,
}

export type FormInputViewMap = { 
    [key in FormInputType]?: FormInputViewConfig<key>
}