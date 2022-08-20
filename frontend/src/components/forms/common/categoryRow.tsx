import { observer } from "mobx-react";
import React, { useState } from "react";
import { GestureResponderEvent, Pressable, StyleSheet, TextStyle, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

type CategoryRowProps = {
    id: string,
    name: string,
    items: {
        id: string, 
        name: string
    }[],
    defaultClosed?: boolean,
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
    defaultClosed,
    categoryFooter,
    categoryLabelStyle,
    itemLabelStyle,
    itemIcon,
    itemRowPressed,
    itemRow,
    categoryLabel
}: CategoryRowProps) => {
    const [isOpen, setIsOpen] = useState(defaultClosed ? false : true);

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

export default CategoryRow;

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