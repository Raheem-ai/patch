import { observer } from "mobx-react"
import React, { useState } from "react"
import { Keyboard, Pressable, StyleSheet, TextStyle, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text } from "react-native-paper"
import { ArrayCollectionUpdate, CategorizedItem } from "../../../../../../common/front"
import Form, { CustomFormHomeScreenProps } from "../../form"
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader"
import { AdHocScreenConfig, InlineFormInputConfig, SectionScreenViewProps } from "../../types"
import TextInput from "../inline/textInput"
import { unwrap } from "../../../../../../common/utils"
import { iHaveAllPermissions } from "../../../../utils"
import Tags from "../../../tags"
import EditCategorizedItemForm from "../../editCategorizedItemForm"
import CategoryRow from "../../common/categoryRow"
import reactStringReplace from 'react-string-replace';
import { Colors, ICONS, globalStyles } from '../../../../types';
import { nativeEventStore } from "../../../../stores/interfaces"
import KeyboardAwareArea from "../../../helpers/keyboardAwareArea"
import TestIds from "../../../../test/ids"
import SelectableText from "../../../helpers/selectableText"

type Props = SectionScreenViewProps<'CategorizedItemList'> 

const CategorizedItemListInput = ({ 
    back,
    config
}: Props) => {

    const wrappedTestID = TestIds.inputs.categorizedItemList.wrapper(config.testID)

    const editScreen: AdHocScreenConfig = {
        name: 'edit',
        screen: ({ back }) => {
            return (
                <EditCategorizedItemForm 
                    testID={wrappedTestID}
                    back={back} 
                    onSaveToastLabel={config.props.editConfig.onSaveToastLabel}
                    // categories={config.props.editConfig.categories}
                    editHeaderLabel={config.props.editConfig.editHeaderLabel} 
                    addCategoryPlaceholderLabel={config.props.editConfig.addCategoryPlaceholderLabel}
                    addItemPlaceholderLabel={config.props.editConfig.addItemPlaceholderLabel}
                    store={config.props.editConfig.editStore} />
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

        const [ originalValues ] = useState(config.val().slice())
        const [ selectedItems, setSelectedItems ] = useState(config.val())
        const [ searchText, setSearchText ] = useState('');

        const isEditable = !!config.props.editConfig
        const iCanEdit = isEditable && iHaveAllPermissions(config.props.editConfig.editPermissions)

        const headerProps: BackButtonHeaderProps = {
            testID: wrappedTestID,
            save: {
                handler: () => {
                    const items = config.props?.editConfig?.filterRemovedItems
                        ? config.props.editConfig.filterRemovedItems(selectedItems)
                        : selectedItems;

                    const diff: ArrayCollectionUpdate<CategorizedItem> = {
                        addedItems: [],
                        removedItems: []
                    }

                    items.forEach(item => {
                        const origIdx = originalValues.findIndex((i) => i.categoryId == item.categoryId && i.itemId == item.itemId)

                        if (origIdx == -1) {
                            // not in original set so it's an add
                            diff.addedItems.push({
                                itemId: item.itemId,
                                categoryId: item.categoryId
                            })
                        }
                    })

                    originalValues.forEach(val => {
                        const selectedIdx = items.findIndex((i) => i.categoryId == val.categoryId && i.itemId == val.itemId)

                        if (selectedIdx == -1) {
                            // in original but not in selected so it's been removed
                            diff.removedItems.push({
                                itemId: val.itemId,
                                categoryId: val.categoryId
                            })
                        }
                    })

                    config.onSave(items, diff);
                    back();
                },
                outline: true
            },
            cancel: {
                handler: () => {
                    config.onCancel?.()
                    back()
                }
            },
            label: unwrap(config.headerLabel),
            labelDecoration: iCanEdit 
                ? {
                    name: 'edit',
                    handler: async () => {
                        await nativeEventStore().hideKeyboard()
                        navigateToScreen('edit')
                    }, 
                    icon: ICONS.edit
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
            const category = config.props.definedCategories().get(targetItem.categoryId)
            const name = category?.items.find(item => item.id == targetItem.itemId)?.name;
        
            if (name) {
                return [name, idx] as [string, number]
            } else {
                null
            }
        }).filter(x => !!x)


        const onItemDeleted = (filteredIdx: number) => {
            const actualIndex = itemInfo[filteredIdx][1]
            const itemToUnselect = selectedItems[actualIndex];
            toggleItem(itemToUnselect.categoryId, itemToUnselect.itemId)
        }

        const searchItemsInputConfig: InlineFormInputConfig<'TextInput'> = {
            testID: TestIds.inputs.categorizedItemList.search(wrappedTestID),
            val: () =>  searchText,
            onChange: (val) => setSearchText(val),
            isValid: () => !!searchText,
            type: 'TextInput',
            name: `search`,
        }

        const searchListArea = () => {

            const fontSize = 16;
            const searchResults: [string, CategorizedItem][] = [];

            let re = new RegExp(`(${searchText})`, 'gi');

            Array.from(config.props.definedCategories().entries()).forEach(([categoryId, category]) => {
                category.items.forEach(item => {
                    // TO DO: replace match with bold and/or black text
                    if (item.name.search(re) > -1 
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
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} onTouchStart={Keyboard.dismiss}>
                    <View style={{ paddingVertical: (styles.itemContainer.height - fontSize) / 2 }}>
                        {
                            searchResults.map(([itemName, itemHandle], idx) => {
                                return (
                                    <Pressable 
                                        onPress={onResultPressed(itemHandle)} 
                                        style={[styles.itemContainer]}
                                        testID={TestIds.inputs.categorizedItemList.searchResultN(wrappedTestID, idx)}
                                        sentry-label={TestIds.inputs.categorizedItemList.searchResultN(wrappedTestID, idx)}
                                    > 
                                        <SelectableText style={{ fontSize, color: '#7F7C7F'}}>
                                            {reactStringReplace(itemName, re, (match, i) => (
                                                <SelectableText testID={TestIds.inputs.categorizedItemList.searchResultMatchTextN(wrappedTestID, idx)} style={{ color: Colors.text.default, fontWeight: '700' }}>{match}</SelectableText>
                                            ))}
                                        </SelectableText>
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
                <ScrollView style={ styles.selectedListArea } showsVerticalScrollIndicator={false} onTouchStart={Keyboard.dismiss}>
                    <View style={{ paddingBottom: 40 }}>
                    {
                        Array.from(config.props.definedCategories().entries()).reverse().map(([categoryId, category], idx) => {
                            
                            const categoryLabelStyle = (categoryId): TextStyle => {
                                return {
                                    color: Colors.text.secondary,
                                    fontWeight: '800',
                                    fontSize: 16
                                }
                            }

                            const itemLabelStyle = (itemId): TextStyle => {
                                const isSelected = selectedItems.findIndex((i) => i.categoryId == categoryId && i.itemId == itemId) != -1;
                                    
                                return isSelected
                                    ? { color: Colors.text.default, fontWeight: '500' }
                                    : { color: Colors.text.secondaryplus}
                            }

                            const itemIcon = (categoryId: string, itemId: string) => {
                                const isSelected = selectedItems.findIndex((i) => i.categoryId == categoryId && i.itemId == itemId) != -1;
                                
                                if (!isSelected) {
                                    return null
                                }

                                return (
                                    <IconButton
                                        icon={ICONS.check} 
                                        color={Colors.icons.dark}
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
                                    testID={TestIds.inputs.categorizedItemList.categoryRowN(wrappedTestID, idx)}
                                    key={category.name}
                                    name={category.name}
                                    isFirst={idx == 0 ? true : false}
                                    items={category.items}
                                    defaultClosed={!!config.props?.setDefaultClosed}
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
                <View style={selectedItems.length ? styles.hasSelectedItems : {}}>
                    <ScrollView style={styles.searchPillContainer} contentContainerStyle={styles.searchPillContents} horizontal={true} showsHorizontalScrollIndicator={false} onTouchStart={Keyboard.dismiss}>
                            <Tags 
                                testID={TestIds.inputs.categorizedItemList.pills(wrappedTestID)}
                                verticalMargin={6} 
                                horizontalTagMargin={6}
                                tags={itemInfo.map(i => i[0])}
                                onTagDeleted={onItemDeleted}/>
                    </ScrollView>
                </View>
            )
        }

        const clearSearch = () => {
            setSearchText('');
        }

        const searchBox = () => {

            return (
                <View style={{ height: 48, borderWidth: 1, borderColor: '#E0DEE0', borderRadius: 30, marginHorizontal: 20, display: 'flex', flexDirection: 'row' }}>
                    <TextInput style={{paddingLeft: 40, marginRight: 0, fontSize: 16, flex: 1 }} config={searchItemsInputConfig}/>
                        <IconButton
                            style={{ alignSelf: 'center', marginVertical: 0, marginRight: 12, marginLeft: 0, width: 25, flexGrow: 0}}
                            icon={ICONS.textInputClear} 
                            color={searchText ? Colors.icons.lighter : Colors.nocolor}
                            onPress={clearSearch}
                            size={25} />
                </View>
            )
        }

        return (
            <KeyboardAwareArea>
                <View onTouchStart={Keyboard.dismiss}>
                    <BackButtonHeader {...headerProps}/>
                </View>
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
            </KeyboardAwareArea>
        )
    })

    return (
        <Form testID={wrappedTestID} inputs={[]} homeScreen={homeScreen} adHocScreens={[ editScreen ]}/>
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
    },
    searchPillContainer: { 
        flexGrow: 0,
        flexShrink: 1, 
        paddingHorizontal: 20, 
        paddingVertical: 8,
    },
    hasSelectedItems: {
        borderBottomWidth: 1,
        borderColor: Colors.borders.list
    },
    searchPillContents: {
        alignItems: 'center',
    },
    selectedListArea: { 
        flex: 1,
    }
})
