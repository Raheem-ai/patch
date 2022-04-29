import { AtLeast } from "../../../../../../common";
import { manageAttributesStore } from "../../../../stores/interfaces";
import { ScreenFormInputConfig } from "../../types";

// export type AttributesListInputConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, 'onSave' | 'val' | 'isValid' | 'name' | 'props'>
type RequiredFields = 'onSave' | 'val' | 'isValid' | 'name'
type DisabledFields = 'type'

type OverrideableConfig = Omit<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields | DisabledFields | 'props'>;
type OverrideableProps = ScreenFormInputConfig<'CategorizedItemList'>['props']
type DefaultConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, DisabledFields>

export type AttributesListInputConfig = AtLeast<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields>

export const AttributesListInput = (config: AttributesListInputConfig) => {
    // not overrideable
    const defaultConfig: DefaultConfig = {
        type: 'CategorizedItemList',
    }

    // default but overrideable
    const overrideableConfig: OverrideableConfig = {
        // icon: 'tag-heart',
        placeholderLabel: () => 'Attributes',
        headerLabel: () => 'Attributes',
    }

    // default but overrideable 
    const overrideableProps: OverrideableProps = {
        editStore: manageAttributesStore().editStore,
        editHeaderLabel: 'Edit attributes',
        addCategoryPlaceholderLabel: 'Add attribute category',
        addItemPlaceholderLabel: 'Add attribute',
        editPermissions: manageAttributesStore().editPermissions,
        onSaveToastLabel: 'Successfully updated Attributes' 
    }

    const resolvedProps = Object.assign({}, overrideableProps, config.props || {});

    return Object.assign(
        {},
        overrideableConfig,
        config,
        { 
            props: resolvedProps
        },
        defaultConfig
    ) as ScreenFormInputConfig<'CategorizedItemList'>
}