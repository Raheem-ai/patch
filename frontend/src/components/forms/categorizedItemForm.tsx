import { observer } from "mobx-react"
import React, { useRef, useState } from "react"
import { GestureResponderEvent, Keyboard, Pressable, StyleSheet, TextStyle, View, TextInput as RNTextInput } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text } from "react-native-paper"
import { CategorizedItem, Category, DefaultRoleIds, PatchPermissions } from "../../../../common/models"
import { resolveErrorMessage } from "../../errors"
import { alertStore, IEditCategorizedItemStore, organizationStore, ISelectCategorizedItemStore, upsertRoleStore, userStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import { AdHocScreenConfig, InlineFormInputConfig, SectionNavigationScreenViewProps, SectionScreenViewProps } from "./types"
import { VisualArea } from '../helpers/visualArea';
import TextInput from "./inputs/textInput"
import { unwrap } from "../../../../common/utils"
import { iHaveAllPermissions, userHasAllPermissions } from "../../utils"
import { useScrollIntoView, wrapScrollView } from "react-native-scroll-into-view"
import useFirstRenderCheck from "../../hooks/useFirstRenderCheck"
import Tags from "../tags"

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = SectionScreenViewProps<'CategorizedItemList'> 

const CategorizedItemForm = ({ 
    back,
    config
}: Props) => {

    const editScreen: AdHocScreenConfig = {
        name: 'edit',
        screen: ({ back }) => {
            return (
                <EditCategorizedItemForm 
                    back={back} 
                    onSaveToastLabel={config.props.onSaveToastLabel}
                    // categories={config.props.categories}
                    editHeaderLabel={config.props.editHeaderLabel} 
                    addCategoryPlaceholderLabel={config.props.addCategoryPlaceholderLabel}
                    addItemPlaceholderLabel={config.props.addItemPlaceholderLabel}
                    store={config.props.editStore} />
            )
        }
    } 

    const homeScreen = observer(({
        onSubmit,
        onContainerPress,
        renderInputs,
        inputs,
        isValid,
        navigateToScreen
    }: CustomFormHomeScreenProps) => {

        const [ selectedItems, setSelectedItems ] = useState(config.val())
        const [ searchText, setSearchText ] = useState('');

        const iCanEdit = iHaveAllPermissions(config.props.editPermissions)

        const headerProps: BackButtonHeaderProps = {
            save: {
                handler: () => {
                    config.onSave(selectedItems);
                    back();
                },
                outline: true
            },
            cancel: {
                handler: back
            },
            label: unwrap(config.headerLabel),
            labelDecoration: iCanEdit 
                ? {
                    handler: () => {
                        navigateToScreen('edit')
                    }, 
                    icon: 'pencil'
                }
                : null
        }

        const toggleItem = (categoryId: string, itemId: string) => {
            const index = selectedItems.findIndex((i) => i.categoryId == categoryId && i.itemId == itemId);

            if (index != -1) {
                const updatedSelection = selectedItems.slice()
                updatedSelection.splice(index, 1);
                setSelectedItems(updatedSelection)
            } else {
                const updatedSelection = [...selectedItems, { categoryId, itemId }];
                setSelectedItems(updatedSelection)
            }
        }

        const itemInfo = selectedItems.map((targetItem, idx) => {
            const category = config.props.editStore.definedCategories.get(targetItem.categoryId)
            const name = category.items.find(item => item.id == targetItem.itemId)?.name;
        
            if (name) {
                return [name, idx] as [string, number]
            } else {
                null
            }
        }).filter(x => !!x)


        const onItemDelted = (filteredIdx: number) => {
            const actualIndex = itemInfo[filteredIdx][1]
            const itemToUnselect = selectedItems[actualIndex];
            toggleItem(itemToUnselect.categoryId, itemToUnselect.itemId)
        }

        const searchItemsInputConfig: InlineFormInputConfig<'TextInput'> = {
            val: () =>  searchText,
            onChange: (val) => setSearchText(val),
            isValid: () => !!searchText,
            type: 'TextInput',
            name: `search`
        }

        const searchListArea = () => {

            const fontSize = 16;
            const searchResults: [string, CategorizedItem][] = [];

            Array.from(config.props.editStore.definedCategories.entries()).forEach(([categoryId, category]) => {
                category.items.forEach(item => {
                    if (item.name.startsWith(searchText) 
                        // only show unselected results
                        && (selectedItems.findIndex(i => i.categoryId == categoryId && i.itemId == item.id)) == -1) 
                    {
                        searchResults.push([item.name, { categoryId, itemId: item.id } ]);
                    }
                })
            })

            const onResultPressed = (itemHandle: CategorizedItem) => () => {
                toggleItem(itemHandle.categoryId, itemHandle.itemId);
                setSearchText('');
                Keyboard.dismiss()
            }

            return (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ paddingVertical: (styles.itemContainer.height - fontSize) / 2 }}>
                        {
                            searchResults.map(([itemName, itemHandle]) => {
                                return (
                                    <Pressable onPress={onResultPressed(itemHandle)} style={[styles.itemContainer]}> 
                                        <Text style={{ fontSize, color: '#7F7C7F'}}>{itemName}</Text>
                                    </Pressable>
                                )
                            })
                        }
                    </View>
                </ScrollView>
            )
        }

        const selectedListArea = () => {
            return (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ }}>
                    {
                        Array.from(config.props.editStore.definedCategories.entries()).reverse().map(([categoryId, category]) => {
                            
                            const categoryLabelStyle = (categoryId): TextStyle => {
                                return {
                                    color: '#666',
                                    fontWeight: 'normal'
                                }
                            }

                            const itemLabelStyle = (itemId): TextStyle => {
                                const isSelected = selectedItems.findIndex((i) => i.categoryId == categoryId && i.itemId == itemId) != -1;
                                    
                                return isSelected
                                    ? { fontWeight: 'bold' }
                                    : { color: '#666'}
                            }

                            const itemIcon = (categoryId: string, itemId: string) => {
                                const isSelected = selectedItems.findIndex((i) => i.categoryId == categoryId && i.itemId == itemId) != -1;
                                
                                if (!isSelected) {
                                    return null
                                }

                                return (
                                    <IconButton
                                        icon={'check'} 
                                        color={'#000'}
                                        size={30} 
                                        style={{ margin: 0, padding: 0, width: 30 }}
                                        />
                                )
                            }
                        
                            const itemRowPressed = (itemId: string) => {
                                toggleItem(categoryId, itemId)
                            }
                            
                            return (
                                <CategoryRow 
                                    key={category.name}
                                    name={category.name}
                                    items={category.items}
                                    id={categoryId}
                                    categoryLabelStyle={categoryLabelStyle}
                                    itemLabelStyle={itemLabelStyle}
                                    itemIcon={itemIcon}
                                    itemRowPressed={itemRowPressed}/>
                            )
                        })
                    }
                    </View>
                </ScrollView>
            )
        }

        const searchPillArea = () => {
            return (
                <View style={{ paddingHorizontal: 20, paddingVertical: (20 - 6) }}>
                    <Tags 
                        verticalMargin={6} 
                        horizontalTagMargin={6}
                        tags={itemInfo.map(i => i[0])}
                        onTagDeleted={onItemDelted}/>
                </View>
            )
        }

        const searchBox = () => {

            return (
                <View style={{ height: 48, borderWidth: 1, borderColor: '#E0DEE0', borderRadius: 30, marginHorizontal: 20 }}>
                    <TextInput style={{paddingHorizontal: 40, fontSize: 16 }} config={searchItemsInputConfig}/>
                </View>
            )
        }

        return (
            <>
                <BackButtonHeader {...headerProps}/>
                
                {/* search area */}
                { searchBox() }

                {/* categories + items (selection) */}
                { searchText.length
                    ? searchListArea()
                    : <>
                        { searchPillArea() }
                        { selectedListArea() }
                    </>
                }
            </>
        )
    })

    return (
        <VisualArea>
            <Form inputs={[]} homeScreen={homeScreen} adHocScreens={[ editScreen ]}/>
        </VisualArea>
    )
}

export default CategorizedItemForm;

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
                    back()
                } catch (e) {
                    alertStore().toastError(resolveErrorMessage(e))
                }
            },
            label: 'Save'
        },
        cancel: {
            handler: () => {
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
                icon={'minus'} 
                color='#999'
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
                <TextInput config={editItemInputConfig} />
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
                style={{ fontSize: 18, fontWeight: 'bold' }} 
                config={editCategoryInputConfig}/>
        )
    }

    return (
        <>
            <BackButtonHeader {...headerProps}/>
            
            {/* add category */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 60 }}>
                <TextInput config={addCategoryInputConfig} onSubmitEditing={onKeyboardSubmit} disableAutoCorrect/>
                <View style={{ margin: 20 }}>
                    <IconButton
                        onPress={addCategory}
                        icon={'plus'} 
                        color='#666'
                        size={20} 
                        style={{ margin: 0, padding: 0, width: 20 }}
                        />
                </View>
            </View>
            
            {/* categories + items (add/remove) */}
            <WrappedScrollView style={{  }} showsVerticalScrollIndicator={false}>
                {
                    // reverse so the newest one is always at the top
                    Array.from(store.categories.entries()).reverse().map(([categoryId, category]) => {
                        const removeCategory = {
                            icon: 'delete',
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
                                    addItemToCategory={store.addItemToCategory}
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
        </>
    )
})

const AddItemFooter = ({
    categoryId, 
    addItemToCategory,
    addItemPlaceholderLabel,
    noItems
}: { 
    categoryId: string, 
    addItemToCategory: IEditCategorizedItemStore['addItemToCategory'],
    addItemPlaceholderLabel: string,
    noItems: boolean
}) => {
    const [newItemText, setNewItemText] = useState('');
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
        val: () =>  newItemText,
        onChange: (val) => setNewItemText(val),
        isValid: () => !!newItemText,
        placeholderLabel: addItemPlaceholderLabel,
        type: 'TextInput',
        name: `${categoryId}-newItem`
    }

    const addItem = () => {
        if (addItemInputConfig.isValid()) {
            addItemToCategory(categoryId, newItemText)
            
            setTimeout(() => {
                setNewItemText('');
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
            <Pressable onPress={addItem} style={{ margin: 20 }}>
                <IconButton
                    icon={'plus'} 
                    color='#999'
                    size={20} 
                    style={{ margin: 0, padding: 0, width: 20 }}
                    />
            </Pressable>
        </View>
    )

}

type CategoryRowProps = {
    id: string,
    name: string,
    items: {
        id: string, 
        name: string
    }[],
    categoryAction?: {
        icon: string
        handler: (categoryId: string) => void
    }
    categoryFooter?: () => JSX.Element,
    itemLabelStyle?: (itemId: string ) => TextStyle,
    categoryLabelStyle?: (categoryId: string ) => TextStyle,
    itemIcon?: (categoryId: string, itemId: string) => JSX.Element,
    itemRowPressed?: (itemId: string) => void,
    itemRow?: (props: { id: string, name: string }) => JSX.Element
    categoryLabel?: (props: { id: string, name: string }) => JSX.Element
}

const CategoryRow = observer(({
    id,
    name,
    items,
    categoryAction,
    categoryFooter,
    categoryLabelStyle,
    itemLabelStyle,
    itemIcon,
    itemRowPressed,
    itemRow,
    categoryLabel
}: CategoryRowProps) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleOpen = () => {
        setIsOpen(!isOpen)
    }

    const categoryActionPressed = (e: GestureResponderEvent) => {
        e.stopPropagation();
        categoryAction.handler(id)
    }

    const defaultItemRow = (item: { id: string, name: string }) => {
        return (
            <Pressable key={item.id} onPress={() => itemRowPressed?.(item.id)} style={styles.itemContainer}>
                <Text style={[{ flex: 1, fontSize: 16 }, itemLabelStyle ? itemLabelStyle(item.id) : null]}>{item.name}</Text>
                {
                    itemIcon 
                        ? itemIcon(id, item.id)
                        : null
                }
            </Pressable>
        )
    }

    return (
        <View>
            <Pressable onPress={toggleOpen} style={styles.categoryHeaderContainer}>
                <View style={{ marginHorizontal: 15 }}>
                    <IconButton
                        icon={isOpen ? 'chevron-up': 'chevron-down'} 
                        color='#666'
                        size={30} 
                        style={{ margin: 0, padding: 0, width: 30 }}
                        />
                </View>
                <View style={styles.categoryLabelContainer}>
                    { categoryLabel
                        ? categoryLabel({ id, name })
                        : <Text style={[{ fontSize: 16, fontWeight: 'bold' }, categoryLabelStyle ? categoryLabelStyle(id) : null]}>{name.toUpperCase()}</Text>
                    }   
                </View>
                {
                    categoryAction 
                        ? <View style={{ margin: 20 }}>
                            <IconButton
                                onPress={categoryActionPressed}
                                icon={categoryAction.icon} 
                                color='#666'
                                size={20} 
                                style={{ margin: 0, padding: 0, width: 20 }}
                                />
                        </View>
                        : null
                }
            </Pressable>
            {
                isOpen
                    ? items.map(item => {
                        return itemRow 
                            ? itemRow(item) 
                            : defaultItemRow(item)
                    })
                : null
            }
            { isOpen
                ? categoryFooter?.() 
                : null 
            }
        </View>
    )
})

const styles = StyleSheet.create({
    categoryHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60
    }, 
    categoryLabelContainer: {
        flex: 1
    }, 
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    }
})