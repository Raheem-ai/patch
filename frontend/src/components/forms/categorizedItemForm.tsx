import { observer } from "mobx-react"
import React, { useState } from "react"
import { GestureResponderEvent, Keyboard, Pressable, StyleSheet, TextStyle, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text } from "react-native-paper"
import { DefaultRoleIds } from "../../../../common/models"
import { resolveErrorMessage } from "../../errors"
import { alertStore, IEditCategorizedItemStore, organizationStore, ISelectCategorizedItemStore, upsertRoleStore, userStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import { AdHocScreenConfig, InlineFormInputConfig, SectionNavigationScreenViewProps } from "./types"
import { VisualArea } from '../helpers/visualArea';
import TextInput from "./inputs/textInput"

type Props = SectionNavigationScreenViewProps & {
    headerLabel: string,
    editHeaderLabel: string,
    addCategoryPlaceholderLabel: string,
    addItemPlaceholderLabel: string,
    editStore: IEditCategorizedItemStore,
    selectStore: ISelectCategorizedItemStore
};

const CategorizedItemForm = ({ 
    back,
    headerLabel,
    editHeaderLabel,
    editStore,
    selectStore,
    addCategoryPlaceholderLabel,
    addItemPlaceholderLabel
}: Props) => {

    const editScreen: AdHocScreenConfig = {
        name: 'edit',
        screen: ({ back }) => {
            return <EditCategorizedItemForm 
                back={back} 
                editHeaderLabel={editHeaderLabel} 
                addCategoryPlaceholderLabel={addCategoryPlaceholderLabel}
                addItemPlaceholderLabel={addItemPlaceholderLabel}
                store={editStore} />
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

        const headerProps: BackButtonHeaderProps = {
            save: {
                handler: back,
                outline: true
            },
            label: headerLabel,
            bottomBorder: true,
            labelDecoration: {
                handler: () => {
                    navigateToScreen('edit')
                }, 
                icon: 'pencil'
            }
        }

        return (
            <>
                <BackButtonHeader {...headerProps}/>
                
                {/* search area */}
                
                {/* categories + items (selection) */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ borderColor: '#ccc', borderBottomWidth: 1, paddingLeft: 60, padding: 20 }}>
                    {
                        Object.entries(selectStore.categories).map(([categoryId, category]) => {
                            
                            const itemLabelStyle = (itemId): TextStyle => {
                                const isSelected = !!selectStore.selectedItems[categoryId]?.includes(itemId);
                                    
                                return isSelected
                                    ? { fontWeight: 'bold' }
                                    : null
                            }

                            const itemIcon = (categoryId: string, itemId: string) => {
                                const isSelected = !!selectStore.selectedItems[categoryId]?.includes(itemId);
                                    
                                return (
                                    <IconButton
                                        icon={'check'} 
                                        color={isSelected ? '#000' : '#666'}
                                        size={20} 
                                        style={{ margin: 0, padding: 0, width: 20 }}
                                        />
                                )
                            }
                        
                            const itemRowPressed = (itemId: string) => {
                                selectStore.toggleItem(categoryId, itemId)
                            }
                            
                            return (
                                <CategoryRow 
                                    key={category.name}
                                    name={category.name}
                                    items={category.items}
                                    id={categoryId}
                                    itemLabelStyle={itemLabelStyle}
                                    itemIcon={itemIcon}
                                    itemRowPressed={itemRowPressed}/>
                            )
                        })
                    }
                    </View>
                </ScrollView>
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
    addItemPlaceholderLabel: string
}

export const EditCategorizedItemForm = observer(({ 
    back, 
    store,
    editHeaderLabel,
    addCategoryPlaceholderLabel,
    addItemPlaceholderLabel
}: EditScreenViewProps) => {
    const [newCategoryName, setNewCategoryName] = useState('')

    const headerProps: BackButtonHeaderProps = {
        save: {
            handler: store.save,
            label: 'Save'
        },
        cancel: {
            handler: back,
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
            // TODO: need to scroll to added category
        }
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
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 60, paddingRight: 20 }}>
                <TextInput config={editItemInputConfig} />
                {
                    itemIcon 
                        ? itemIcon(categoryId, item.id)
                        : null
                }
            </View>
        )
    }

    return (
        <>
            <BackButtonHeader {...headerProps}/>
            
            {/* add category */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 60 }}>
                <TextInput config={addCategoryInputConfig} />
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
            <ScrollView style={{  }} showsVerticalScrollIndicator={false}>
                {
                    Array.from(store.categories.entries()).map(([categoryId, category]) => {
                        const removeCategory = {
                            icon: 'delete',
                            handler: store.removeCategory
                        }

                        const categoryFooter = () => 
                            <AddItemFooter 
                                categoryId={categoryId} 
                                addItemToCategory={store.addItemToCategory}
                                addItemPlaceholderLabel={addItemPlaceholderLabel}/>;

                        return (
                            <CategoryRow 
                                key={categoryId}
                                name={category.name}
                                items={category.items}
                                id={categoryId}
                                categoryAction={removeCategory}
                                categoryFooter={categoryFooter}
                                itemRow={editItemRow(categoryId)}/>
                        )
                    })
                }
            </ScrollView>
        </>
    )
})

const AddItemFooter = ({
    categoryId, 
    addItemToCategory,
    addItemPlaceholderLabel
}: { 
    categoryId: string, 
    addItemToCategory: IEditCategorizedItemStore['addItemToCategory'],
    addItemPlaceholderLabel: string
}) => {
    const [newItemText, setNewItemText] = useState('');

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
            setNewItemText('');
        }
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 60, paddingLeft: 60 }}>
            <TextInput config={addItemInputConfig} />
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
    itemIcon?: (categoryId: string, itemId: string) => JSX.Element,
    itemRowPressed?: (itemId: string) => void,
    itemRow?: (props: { id: string, name: string }) => JSX.Element
}

const CategoryRow = ({
    id,
    name,
    items,
    categoryAction,
    categoryFooter,
    itemLabelStyle,
    itemIcon,
    itemRowPressed,
    itemRow
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
                <Text style={itemLabelStyle ? itemLabelStyle(item.id) : null}>{item.name}</Text>
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
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{name.toUpperCase()}</Text>
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
}

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
        paddingRight: 20
    }
})