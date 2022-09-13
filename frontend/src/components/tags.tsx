import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { ICONS } from '../types';

type Props = {
    tags: string[],
    verticalMargin: number,
    dark?: boolean,
    disabled?: boolean,
    onTagDeleted?: (idx: number, tag: string) => void
    tagContainerStyle?: StyleProp<ViewStyle>,
    tagTextStyle?: StyleProp<TextStyle>,
    centered?: boolean
    horizontalTagMargin?: number
}

export default function Tags(props: Props) {

    const onDeleteTagTapped = (idx: number, tag: string) => () => {
        props.onTagDeleted(idx, tag);
    }

    return (
        <View style={[styles.container, { marginTop: props.verticalMargin }, props.centered ? styles.centeredContainer : null ]}>
            { 
                props.tags.map((t, idx) => {
                    return (
                        <View 
                            style={[
                                styles.tagContainer, 
                                { backgroundColor: props.dark 
                                    ? props.disabled 
                                        ? styles.darkDisabled.backgroundColor
                                        : styles.dark.backgroundColor 
                                    : props.disabled 
                                        ? styles.lightDisabled.backgroundColor
                                        : styles.light.backgroundColor 
                                },
                                { marginBottom: props.verticalMargin },
                                props.tagContainerStyle,
                                props.horizontalTagMargin
                                    ? { marginRight: props.horizontalTagMargin }
                                    : null
                            ]}
                            key={t}
                        >
                            <Text style={[
                                styles.tagText, 
                                { color: props.dark 
                                    ? props.disabled 
                                        ? styles.darkDisabled.color
                                        : styles.dark.color 
                                    : props.disabled 
                                        ? styles.lightDisabled.color
                                        : styles.light.color 
                                },
                                props.tagTextStyle
                            ]}>{t}</Text>
                            {   
                                props.onTagDeleted 
                                    ? <IconButton
                                        style={styles.closeIcon}
                                        icon={ICONS.deleteItem} 
                                        color={props.dark ? styles.dark.color : styles.light.color}
                                        onPress={onDeleteTagTapped(idx, t)}
                                        size={styles.closeIcon.height}></IconButton>
                                    : null
                            }
                        </View>
                    )
                })
            }
        </View>
    )    

}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        // position: 'relative'
    },
    centeredContainer: {
        justifyContent: 'center'
    },
    tagContainer: {
        borderRadius: 6,
        padding: 8,
        marginRight: 12,
        flexDirection: 'row'
        // marginBottom: 12,
        // position: 'relative'
    },
    dark: {
        color: '#e0e0e0',
        backgroundColor: '#111'
    }, 
    light: {
        color: '#666',
        backgroundColor: '#e0e0e0'
    },
    darkDisabled: {
        color: '#e0e0e0',
        backgroundColor: '#333'
    }, 
    lightDisabled: {
        color: '#666',
        backgroundColor: '#c0c0c0'
    },
    closeIcon: {
        alignSelf: 'center',
        margin: 0,
        padding: 0,
        height: 20,
        width: 20,
        marginLeft: 8
    },
    tagText: {
        alignSelf: 'center'
    }
})