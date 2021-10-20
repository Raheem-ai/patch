import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

type Props = {
    tags: string[],
    verticalMargin: number,
    dark?: boolean,
    onTagDeleted?: (idx: number) => void
}

export default function Tags(props: Props) {

    const onDeleteTagTapped = (idx: number) => () => {
        props.onTagDeleted(idx);
    }

    return (
        <View style={[styles.container, { marginTop: props.verticalMargin }]}>
            { 
                props.tags.map((t, idx) => {
                    return (
                        <View 
                            style={[
                                styles.tagContainer, 
                                { backgroundColor: props.dark ? styles.dark.backgroundColor : styles.light.backgroundColor },
                                { marginBottom: props.verticalMargin }
                            ]}
                            key={t}
                        >
                            <Text style={[styles.tagText, { color: props.dark ? styles.dark.color : styles.light.color }]}>{t}</Text>
                            {   
                                props.onTagDeleted 
                                    ? <IconButton
                                        style={styles.closeIcon}
                                        icon='close' 
                                        color={props.dark ? styles.dark.color : styles.light.color}
                                        onPress={onDeleteTagTapped(idx)}
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