import { AtLeast } from "../../../../../../common";
import { manageTagsStore } from "../../../../stores/interfaces";
import { ScreenFormInputConfig } from "../../types";

type RequiredFields = 'onSave' | 'val' | 'isValid' | 'name'
type DisabledFields = 'type'

type OverrideableConfig = Omit<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields | DisabledFields | 'props'>;
type OverrideableProps = ScreenFormInputConfig<'CategorizedItemList'>['props']
type DefaultConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, DisabledFields>

export type TagsListInputConfig = AtLeast<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields>

export const TagsListInput = (config: TagsListInputConfig) => {
    // not overrideable
    const defaultConfig: DefaultConfig = {
        type: 'CategorizedItemList',
    }

    // default but overrideable
    const overrideableConfig: OverrideableConfig = {
        // icon: 'tag-heart',
        placeholderLabel: () => 'Tags',
        headerLabel: () => 'Tags',
    }

    // default but overrideable 
    const overrideableProps: OverrideableProps = {
        editStore: manageTagsStore().editStore,
        editHeaderLabel: 'Edit tags',
        addCategoryPlaceholderLabel: 'Add tag category',
        addItemPlaceholderLabel: 'Add tag',
        editPermissions: manageTagsStore().editPermissions,
        onSaveToastLabel: 'Successfully updated Tags' 
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