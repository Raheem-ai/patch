import React, { useState } from "react"
import { StyleProp, StyleSheet, TouchableWithoutFeedback, View, ViewStyle } from "react-native"
import { IconButton, Text } from "react-native-paper";

export type ListHeaderProps<F, S> = {
    openHeaderLabel: string,
    
    chosenFilter: F
    chosenSortBy: S

    filters: F[]
    sortBys: S[]

    filterToHeaderLabel: (filter: F) => string
    sortByToHeaderLabel: (sortBy: S) => string
    filterToOptionLabel: (filter: F) => string
    sortByToOptionLabel: (sortBy: S) => string

    onFilterUpdate: (filter: F) => void
    onSortByUpdate: (sortBy: S) => void

    openHeaderStyles?: StyleProp<ViewStyle>
    closedHeaderStyles?: StyleProp<ViewStyle>
}

const ListHeader = <Filter, SortBy>(props: ListHeaderProps<Filter, SortBy>) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleHeader = () => {
        setIsOpen(!isOpen)
    }

    const headerSection = () => {
        let label = isOpen
            ? props.openHeaderLabel
            : [
                props.chosenFilter ? props.filterToHeaderLabel(props.chosenFilter) : null, 
                props.chosenSortBy ? props.sortByToHeaderLabel(props.chosenSortBy) : null
            ].filter(val => !!val).join(' · ')

        return (
            <TouchableWithoutFeedback onPress={toggleHeader}>
                <View style={[styles.headerContainer, isOpen ? props.openHeaderStyles : props.closedHeaderStyles]}>
                    <Text style={[styles.headerLabel, isOpen ? styles.openHeaderLabel : null ]}>{label}</Text>
                    <IconButton 
                        style={styles.toggleHeaderButton}
                        size={36}
                        color={'#999'}
                        icon={isOpen ? 'chevron-up' : 'chevron-down'}/>
                </View>
            </TouchableWithoutFeedback>
        )
    }

    const filterSection = () => {
        return (
            <View style={styles.filterContainer}>
                {
                    props.filters.map(filter => {
                        const label = props.filterToOptionLabel(filter);
                        const isChosen = filter == props.chosenFilter;

                        const chooseMe = () => {
                            props.onFilterUpdate(filter)
                        }

                        return isChosen 
                            ? <View style={[styles.optionContainer, styles.chosenOptionContainer]}>
                                <Text style={[styles.option, styles.chosenOption]}>{label}</Text>
                            </View>
                            : <Text onPress={chooseMe} style={[styles.option, styles.optionContainer]}>{label}</Text>
                    })
                }
            </View>
        )
    }

    const sortSection = () => {
        return (
            <View style={styles.sortyByContainer}>
                {
                    props.sortBys.map(sortBy => {
                        const label = props.sortByToOptionLabel(sortBy);
                        const isChosen = sortBy == props.chosenSortBy;

                        const chooseMe = () => {
                            props.onSortByUpdate(sortBy)
                        }

                        return isChosen 
                            ? <View style={[styles.optionContainer, styles.chosenOptionContainer]}>
                                <Text style={[styles.option, styles.chosenOption]}>{label}</Text>
                            </View>
                            : <Text onPress={chooseMe} style={[styles.option, styles.optionContainer]}>{label}</Text>
                    })
                }
            </View>
        )
    }
    
    return (
        <View style={styles.container}>
            {headerSection()}
            { isOpen 
                ? [
                    filterSection(),
                    sortSection()
                ]
                : null
            }
        </View>
    )
}

export default ListHeader

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F0F0F0'
    },
    headerContainer: {
        height: 46,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomColor: '#E0E0E0',
        borderBottomWidth: 1,
        borderStyle: "solid"
    },
    toggleHeaderButton: {
        alignSelf: 'center'
    },
    filterContainer: {
        height: 48,
        flexDirection: 'row',
        borderBottomColor: '#E0E0E0',
        borderBottomWidth: 1,
        borderStyle: "solid",
        marginHorizontal: 12
    },
    sortyByContainer: {
        height: 48,
        flexDirection: 'row',
        marginHorizontal: 12
    },
    headerLabel: {
        alignSelf: 'center',
        marginHorizontal: 12,
        fontSize: 14,
        color: '#333'
    },
    openHeaderLabel: {
        color: '#111',
        fontWeight: 'bold'
    },
    optionContainer: {
        paddingVertical: 2,
        alignSelf: 'center',
        marginRight: 18
    },
    chosenOptionContainer: {
        paddingHorizontal: 6,
        backgroundColor: '#999',
        borderRadius: 14
    },
    option: {
        fontSize: 14,
        color: '#333'
    }, 
    chosenOption: {
        fontWeight: 'bold',
        color: '#fff',
    }
})