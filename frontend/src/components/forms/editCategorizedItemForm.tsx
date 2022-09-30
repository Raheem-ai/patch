import { observer } from "mobx-react";
import React, { useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, View, TextStyle, TextInput as RNTextInput, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";
import { useScrollIntoView, wrapScrollView } from "react-native-scroll-into-view";
import { resolveErrorMessage } from "../../errors";
import useFirstRenderCheck from "../../hooks/useFirstRenderCheck";
import { alertStore, IEditCategorizedItemStore, nativeEventStore } from "../../stores/interfaces";
import { ICONS, Colors } from "../../types";
import KeyboardAwareArea from "../helpers/keyboardAwareArea";
import CategoryRow from "./common/categoryRow";
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader";
import TextInput from "./inputs/inline/textInput";
import { InlineFormInputConfig } from "./types";

const WrappedScrollView = wrapScrollView(ScrollView)

type EditScreenViewProps = {
    store: IEditCategorizedItemStore,
    back: () => void,
    editHeaderLabel: string,
    addCategoryPlaceholderLabel: string
    addItemPlaceholderLabel: string,
    onSaveToastLabel: string
}

export const EditCategorizedItemForm = observer(({ 
    back, 
    store,
    onSaveToastLabel,
    editHeaderLabel,
    addCategoryPlaceholderLabel,
    addItemPlaceholderLabel
}: EditScreenViewProps) => {
    const [newCategoryName, setNewCategoryName] = useState('')
    const checkIfFirstRender = useFirstRenderCheck();
    const isFirstRender = checkIfFirstRender();

    const headerProps: BackButtonHeaderProps = {
        save: {
            handler: async () => {
                try {
                    await store.save()
                    alertStore().toastSuccess(onSaveToastLabel)
                    await nativeEventStore().hideKeyboard()
                    back()
                } catch (e) {
                    alertStore().toastError(resolveErrorMessage(e));
                }
            },
            label: 'Save'
        },
        cancel: {
            handler: async () => {
                await nativeEventStore().hideKeyboard()
                back()
                store.clear()
            }
        },
        label: editHeaderLabel,
        bottomBorder: true, 
    }

    const addCategoryInputConfig: InlineFormInputConfig<'TextInput'> = {
        val: () =>  newCategoryName,
        onChange: (val) => setNewCategoryName(val),
        isValid: () => !!newCategoryName,
        placeholderLabel: addCategoryPlaceholderLabel,
        type: 'TextInput',
        name: 'newCategory'
    }

    const addCategory = () => {
        if (addCategoryInputConfig.isValid()) {
            store.addCategory(newCategoryName)
            setNewCategoryName('');
            Keyboard.dismiss();
        }
    }

    const onKeyboardSubmit = () => {
        addCategory()
    }

    const itemIcon = (categoryId, itemId) => {
        return  (
            <IconButton
                onPress={() => store.removeItemFromCategory(categoryId, itemId)}
                icon={ICONS.removeCategorizedItem} 
                color={Colors.icons.lighter}
                size={20} 
                style={{ margin: 0, padding: 0, width: 20 }}
                />
        )
    }

    const editItemRow =  (categoryId: string) => (item: { id: string, name: string }) => {
        const editItemInputConfig: InlineFormInputConfig<'TextInput'> = {
            val: () =>  item.name,
            onChange: (val) => store.editItem(categoryId, item.id, val),
            isValid: () => !!item.name,
            type: 'TextInput',
            name: `${categoryId}-editItem`
        }
        
        return (
            <View key={item.id} style={styles.itemContainer}>
                <TextInput config={editItemInputConfig} style={{color: Colors.text.secondaryplus}}/>
                {
                    itemIcon 
                        ? itemIcon(categoryId, item.id)
                        : null
                }
            </View>
        )
    }

    const categoryLabel = (props: { id: string, name: string }) => {
        const editCategoryInputConfig: InlineFormInputConfig<'TextInput'> = {
            val: () =>  props.name,
            onChange: (val) => store.editCategory(props.id, val),
            isValid: () => !!props.name,
            type: 'TextInput',
            name: `${props.id}-editCategory`
        }

        return (
            <TextInput 
                style={{ fontSize: 16, fontWeight: 'bold' }} 
                config={editCategoryInputConfig}/>
        )
    }

    return (
        <KeyboardAwareArea>
            <BackButtonHeader {...headerProps}/>
            
            {/* add category */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 60, borderBottomWidth: 1, borderColor: Colors.borders.list }}>
                <TextInput config={addCategoryInputConfig} onSubmitEditing={onKeyboardSubmit} disableAutoCorrect/>
            </View>
            
            {/* categories + items (add/remove) */}
            <WrappedScrollView style={{  }} contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
                {
                    // reverse so the newest one is always at the top
                    Array.from(store.categories.entries()).reverse().map(([categoryId, category]) => {
                        const removeCategory = {
                            icon: ICONS.deleteCategory,
                            handler: store.removeCategory
                        }

                        const categoryFooter = () => {
                            return (
                                <AddItemFooter
                                    // only trigger autofocus behavior for create Category -> create first Item
                                    // flow when a new category is created vs when there are categories with no items
                                    // on an initial render
                                    noItems={isFirstRender ? false : !category.items.length}
                                    categoryId={categoryId} 
                                    store={store}
                                    addItemPlaceholderLabel={addItemPlaceholderLabel}/>
                            )
                        }

                        return (
                            <CategoryRow 
                                key={categoryId}
                                name={category.name}
                                items={category.items}
                                id={categoryId}
                                categoryAction={removeCategory}
                                categoryFooter={categoryFooter}
                                categoryLabel={categoryLabel}
                                itemRow={editItemRow(categoryId)}/>
                        )
                    })
                }
            </WrappedScrollView>
        </KeyboardAwareArea>
    )
})

const AddItemFooter = ({
    categoryId,
    store, 
    addItemPlaceholderLabel,
    noItems
}: { 
    store: IEditCategorizedItemStore
    categoryId: string, 
    addItemPlaceholderLabel: string,
    noItems: boolean
}) => {
    const me = useRef<View>();
    const itemInputRef = useRef<RNTextInput>();
    const scrollIntoView = useScrollIntoView();
    const checkIfFirstRender = useFirstRenderCheck();
    const isFirstRender = checkIfFirstRender();

    // new category was just created in the ui
    if (isFirstRender && noItems) {
        setTimeout(() => {
            // focus on the text input
            itemInputRef.current?.focus()
        })
    }
    
    const addItemInputConfig: InlineFormInputConfig<'TextInput'> = {
        val: () =>  store.pendingItems.get(categoryId) || '',
        onChange: (val) => store.updatePendingItem(categoryId, val),
        isValid: () => !!store.pendingItems.get(categoryId),
        placeholderLabel: addItemPlaceholderLabel,
        type: 'TextInput',
        name: `${categoryId}-newItem`
    }

    const addItem = () => {
        if (addItemInputConfig.isValid()) {
            store.addItemToCategory(categoryId, store.pendingItems.get(categoryId))
            
            setTimeout(() => {
                store.updatePendingItem(categoryId, '');
                scrollIntoView(me.current)
            })
        }
    }

    const onKeyboardSubmit = () => {
        addItem()
    }

    return (
        <View ref={me} style={{ flexDirection: 'row', alignItems: 'center', height: styles.itemContainer.height, paddingLeft: 60 }}>
            <TextInput nativeRef={itemInputRef} config={addItemInputConfig} onSubmitEditing={onKeyboardSubmit} dontBlurOnSubmit/>
        </View>
    )

}

export default EditCategorizedItemForm;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    }
})