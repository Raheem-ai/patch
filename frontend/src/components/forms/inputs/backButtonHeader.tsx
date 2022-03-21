import { observer } from "mobx-react"
import React from "react"
import { StyleSheet, View } from "react-native"
import { Button, IconButton, Text } from "react-native-paper"
import { Colors } from "../../../types"

const BackButtonHeader = observer(({ 
    back, 
    save, 
    label 
}: { 
    back: () => void, 
    save: () => void, 
    label: string | (() => string)  
}) => {
    const textLabel = typeof label == 'function'
        ? label()
        : label;
    
    return <View style={styles.backButtonHeader}>
        <Text style={{ flex: 1, fontSize: 18 }} onPress={back}>{textLabel}</Text>
        <Button
            uppercase={false} 
            color={Colors.primary.alpha}
            mode='text'
            onPress={back}
            style={styles.headerCancelButton}>Cancel</Button>
        <Button
            uppercase={false} 
            color={Colors.primary.alpha}
            mode='outlined'
            onPress={save}
            style={styles.headerDoneButton}>Done</Button>
    </View>
})

export default BackButtonHeader
const styles = StyleSheet.create({
    backButtonHeader: {
        // height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: 0,
        padding: 15
    },
    headerCancelButton: {

    },
    headerDoneButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
        borderRadius: 32
    }
})    