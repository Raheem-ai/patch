import { observer } from "mobx-react"
import React, { useState } from "react"
import { Keyboard, Pressable, StyleSheet, TextStyle, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text } from "react-native-paper"
import { CategorizedItem } from "../../../../../../common/models"
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { AdHocScreenConfig, InlineFormInputConfig, SectionScreenViewProps } from "../../types"
import { VisualArea } from '../../../helpers/visualArea';
import TextInput from "../inline/textInput"
import { unwrap } from "../../../../../../common/utils"
import { iHaveAllPermissions } from "../../../../utils"
import Tags from "../../../tags"
import EditCategorizedItemForm from "../../editCategorizedItemForm"
import CategoryRow from "../../common/categoryRow"

type Props = SectionScreenViewProps<'CategorizedItemList'> 

const CategorizedItemListInput = ({ 
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
                handler: () => back()
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

export default CategorizedItemListInput;

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 20,
        height: 48
    }
})