import { AtLeast } from "../../../../../../common";
import STRINGS from "../../../../../../common/strings";
import { manageAttributesStore } from "../../../../stores/interfaces";
import { ScreenFormInputConfig } from "../../types";

// export type AttributesListInputConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, 'onSave' | 'val' | 'isValid' | 'name' | 'props'>
type RequiredFields = 'onSave' | 'val' | 'isValid' | 'name' | 'testID'
type DisabledFields = 'type'

type OverrideableConfig = Omit<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields | DisabledFields | 'props'>;
type OverrideableProps = ScreenFormInputConfig<'CategorizedItemList'>['props']
type OverrideableEditConfig = ScreenFormInputConfig<'CategorizedItemList'>['props']['editConfig']
type DefaultConfig = Pick<ScreenFormInputConfig<'CategorizedItemList'>, DisabledFields>

export type AttributesListInputConfig = AtLeast<ScreenFormInputConfig<'CategorizedItemList'>, RequiredFields>

export const AttributesListInput = (config: AttributesListInputConfig) => {
    // not overrideable
    const defaultConfig: DefaultConfig = {
        type: 'CategorizedItemList',
    }

    // default but overrideable
    const overrideableConfig: OverrideableConfig = {
        // icon: ICONS.tag,
        placeholderLabel: () => STRINGS.ELEMENTS.attribute({cap: true, plural: true}),
        headerLabel: () => STRINGS.ELEMENTS.attribute({cap: true, plural: true}),
    }

    // default but overrideable props
    const overrideableProps: OverrideableProps = {
        definedCategories: () => manageAttributesStore().attributeCategories
    }

    // default but overrideable edit config
    const overrideableEditConfig: OverrideableEditConfig = {
        filterRemovedItems: (items) => {
            return items.filter(item => !!manageAttributesStore().getAttribute(item.categoryId, item.itemId));
        },
        editStore: manageAttributesStore().editStore,
        editHeaderLabel: 'Edit attributes',
        addCategoryPlaceholderLabel: STRINGS.INTERFACE.addCategory(),
        addItemPlaceholderLabel: STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.attribute()),
        editPermissions: manageAttributesStore().editPermissions,
        onSaveToastLabel: STRINGS.INTERFACE.successfullyUpdatedElement(STRINGS.ELEMENTS.attribute({cap: false, plural: true}))
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