import React, { useState } from "react"
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { IconButton, Text, TextInput } from "react-native-paper";
import { Colors, ICONS, globalStyles } from "../types";
import STRINGS from "../../../common/strings";
import TestIds from "../test/ids";
import SelectableText from "./helpers/selectableText";

export type ListHeaderOptionConfig<T = any> = {
    chosenOption: T,
    options: T[],
    toHeaderLabel: (option: T) => string,
    toOptionLabel: (option: T) => string,
    onUpdate: (option: T) => void
}

export type ListHeaderProps = {
    openHeaderLabel: string,
    viewIsScrolled?: boolean

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
            <Pressable testID={TestIds.listHeader.toggleHeader} onPress={toggleHeader}>
                <View style={[styles.headerContainer, isOpen ? props.openHeaderStyles : props.closedHeaderStyles]}>
                    <SelectableText style={[styles.headerLabel, isOpen ? styles.openHeaderLabel : null ]}>{label}</SelectableText>
                    <IconButton 
                        style={styles.toggleHeaderButton}
                        size={36}
                        color={Colors.icons.light}
                        icon={isOpen ? ICONS.filterClose : ICONS.filterOpen}/>
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
                            <SelectableText testID={TestIds.listHeader.chosenOption(i, label)} style={[styles.option, styles.chosenOption]}>{label}</SelectableText>
                        </View>
                        : <SelectableText testID={TestIds.listHeader.option(i, label)} onPress={chooseMe} style={[styles.option, styles.optionContainer]}>{label}</SelectableText>
                })
            }
        </View>
    }
    
    return (
        <View style={[styles.container, (props.viewIsScrolled && styles.containerScrolled)]}>
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
        backgroundColor: Colors.backgrounds.filter,
        zIndex: 100
    },
    containerScrolled: globalStyles.basicShadow,
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomColor: Colors.borders.filter,
        borderBottomWidth: 1,
        borderStyle: "solid",

    },
    toggleHeaderButton: {
        alignSelf: 'center',
        margin: 0,
    },
    optionRowContainer: {
        height: 48,
        flexDirection: 'row',
        borderBottomColor: Colors.borders.filter,
        borderBottomWidth: 1,
        borderStyle: "solid",
        paddingHorizontal: 16
    },
    headerLabel: {
        alignSelf: 'center',
        marginHorizontal: 16,
        fontSize: 14,
        color: Colors.text.default
    },
    openHeaderLabel: {
        color: Colors.text.default,
        fontWeight: 'bold'
    },
    optionContainer: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignSelf: 'center',
        marginRight: 18
    },
    chosenOptionContainer: {
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