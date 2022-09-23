import { AtLeast } from "../../../../../../common";
import { manageTagsStore } from "../../../../stores/interfaces";
import { ScreenFormInputConfig } from "../../types";
import STRINGS from "../../../../../../common/strings"

type RequiredFields = 'onSave' | 'val' | 'isValid' | 'name'
type DisabledFields = 'type'

type OverrideableConfig = Omit<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields | DisabledFields | 'props'>;
type OverrideableProps = ScreenFormInputConfig<'CategorizedItemList'>['props']
type OverrideableEditConfig = ScreenFormInputConfig<'CategorizedItemList'>['props']['editConfig']
type DefaultConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, DisabledFields>

export type TagsListInputConfig = AtLeast<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields>

export const TagsListInput = (config: TagsListInputConfig) => {
    // not overrideable
    const defaultConfig: DefaultConfig = {
        type: 'CategorizedItemList',
    }

    // default but overrideable
    const overrideableConfig: OverrideableConfig = {
        // icon: ICONS.tag,
        placeholderLabel: () => STRINGS.ELEMENTS.tag({cap: true, plural: true}),
        headerLabel: () => STRINGS.ELEMENTS.tag({cap: true, plural: true}),
    }

    // default but overrideable props
    const overrideableProps: OverrideableProps = {
        definedCategories: () => manageTagsStore().tagCategories
    }

    // default but overrideable edit config
    const overrideableEditConfig: OverrideableEditConfig = {
        filterRemovedItems: (items) => {
            return items.filter(item => !!manageTagsStore().getTag(item.categoryId, item.itemId));
        },
        editStore: manageTagsStore().editStore,
        editHeaderLabel: STRINGS.INTERFACE.editElement(STRINGS.ELEMENTS.tag({plural: true})),
        addCategoryPlaceholderLabel: STRINGS.INTERFACE.addCategory(),
        addItemPlaceholderLabel: STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.tag()),
        editPermissions: manageTagsStore().editPermissions,
        onSaveToastLabel: STRINGS.INTERFACE.successfullyUpdatedElement(STRINGS.ELEMENTS.tag({cap: false, plural: true}))
    }

    const resolvedEditConfig = Object.assign({}, overrideableEditConfig, config.props?.editConfig || {})

    const resolvedProps = Object.assign({}, overrideableProps, config.props || {}, { editConfig: resolvedEditConfig });

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