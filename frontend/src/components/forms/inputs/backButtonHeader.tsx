import { observer } from "mobx-react"
import React from "react"
import { StyleSheet, View } from "react-native"
import { Button, IconButton, Text } from "react-native-paper"

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
        <IconButton
            icon='chevron-left' 
            color='#000'
            onPress={back}
            size={35} 
            style={{ margin: 0, width: 35 }}/>
        <Text style={{ flex: 1, fontSize: 18 }} onPress={back}>{textLabel}</Text>
        <Button 
            color='orange'
            onPress={save}
            style={styles.headerSaveButton}>save</Button>
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
        // marginBottom: ,
        // borderBottomWidth: 1,
        // borderBottomColor: '#000',

        // textAlign: 'center',
        // textAlignVertical: 'center'
        
    },
    headerSaveButton: {
        // height: 40,
        // borderRadius: 10,
        // backgroundColor: 'orange',
        // color: 'orange'
    }
})    