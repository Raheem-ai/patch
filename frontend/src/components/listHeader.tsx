import React, { useState } from "react"
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { IconButton, Text } from "react-native-paper";
import { Colors } from "../types";
import STRINGS from "../../../common/strings";

export type ListHeaderOptionConfig<T = any> = {
    chosenOption: T,
    options: T[],
    toHeaderLabel: (option: T) => string,
    toOptionLabel: (option: T) => string,
    onUpdate: (option: T) => void
}

export type ListHeaderProps = {
    openHeaderLabel: string,

    optionConfigs: ListHeaderOptionConfig[]

    openHeaderStyles?: StyleProp<ViewStyle>
    closedHeaderStyles?: StyleProp<ViewStyle>
}

const ListHeader = (props: ListHeaderProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleHeader = () => {
        setIsOpen(!isOpen)
    }

    const headerSection = () => {
        let label = isOpen
            ? props.openHeaderLabel
            : (props.optionConfigs || []).map(conf => conf.toHeaderLabel(conf.chosenOption)).filter(val => !!val).join(` ${STRINGS.visualDelim} `)

        return (
            <Pressable onPress={toggleHeader}>
                <View style={[styles.headerContainer, isOpen ? props.openHeaderStyles : props.closedHeaderStyles]}>
                    <Text style={[styles.headerLabel, isOpen ? styles.openHeaderLabel : null ]}>{label}</Text>
                    <IconButton 
                        style={styles.toggleHeaderButton}
                        size={36}
                        color={Colors.icons.light}
                        icon={isOpen ? 'chevron-up' : 'chevron-down'}/>
                </View>
            </Pressable>
        )
    }

    const optionConfigToSection = (conf: ListHeaderOptionConfig, i: number) => {
        return <View key={i} style={styles.optionRowContainer}>
            {
                conf.options.map(opt => {
                    const label = conf.toOptionLabel(opt);
                    const isChosen = opt == conf.chosenOption;

                    const chooseMe = () => {
                        conf.onUpdate(opt)
                    }

                    return isChosen 
                        ? <View style={[styles.optionContainer, styles.chosenOptionContainer]}>
                            <Text style={[styles.option, styles.chosenOption]}>{label}</Text>
                        </View>
                        : <Text onPress={chooseMe} style={[styles.option, styles.optionContainer]}>{label}</Text>
                })
            }
        </View>
    }
    
    return (
        <View style={styles.container}>
            {headerSection()}
            { isOpen 
                ? props.optionConfigs.map(optionConfigToSection)
                : null
            }
        </View>
    )
}

export default ListHeader

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.filter
    },
    headerContainer: {
        height: 46,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomColor: Colors.borders.filter,
        borderBottomWidth: 1,
        borderStyle: "solid"
    },
    toggleHeaderButton: {
        alignSelf: 'center'
    },
    optionRowContainer: {
        height: 48,
        flexDirection: 'row',
        borderBottomColor: Colors.borders.filter,
        borderBottomWidth: 1,
        borderStyle: "solid",
        marginHorizontal: 12
    },
    headerLabel: {
        alignSelf: 'center',
        marginHorizontal: 12,
        fontSize: 14,
        color: Colors.text.default
    },
    openHeaderLabel: {
        color: Colors.text.default,
        fontWeight: 'bold'
    },
    optionContainer: {
        paddingVertical: 2,
        alignSelf: 'center',
        marginRight: 18
    },
    chosenOptionContainer: {
        paddingHorizontal: 6,
        backgroundColor: Colors.backgrounds.filterSelectedItem,
        borderRadius: 14
    },
    option: {
        fontSize: 14,
        color: Colors.text.secondary
    }, 
    chosenOption: {
        fontWeight: 'bold',
        color: Colors.text.defaultReversed,
    }
})