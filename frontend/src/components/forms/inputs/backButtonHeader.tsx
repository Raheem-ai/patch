import { observer } from "mobx-react"
import React from "react"
import { StyleSheet, View } from "react-native"
import { Button, IconButton, Text } from "react-native-paper"
import { unwrap } from "../../../../../common/utils"
import { Colors } from "../../../types"

export type BackButtonHeaderProps = { 
    cancel?: {
        handler: () => void, 
        label?: string | (() => string)
    }
    save?: {
        handler: () => void, 
        label?: string | (() => string)
        outline?: boolean
        validator?: () => boolean
    }
    label: string | (() => string),
    labelDecoration?: {
        handler: () => void,
        icon: string | (()  => string)
    }
    bottomBorder?: boolean
}

const BackButtonHeader = observer(({ 
    cancel, 
    save, 
    label,
    bottomBorder,
    labelDecoration
}: BackButtonHeaderProps) => {
    const headerLabel = unwrap(label);
    const cancelLabel = unwrap(cancel?.label) || 'Cancel';
    const saveLabel = unwrap(save?.label) || 'Done'
    
    return <View style={[styles.backButtonHeader, bottomBorder ? styles.bottomBorder : null ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18 }} onPress={cancel?.handler}>{headerLabel}</Text>
            {
                labelDecoration 
                ? <IconButton
                    onPress={labelDecoration.handler}
                    icon={labelDecoration.icon} 
                    color={'#666'}
                    size={20} 
                    style={{ margin: 0, padding: 0, width: 20 }} />
                : null
            }
        </View>
        { cancel && cancel.handler
            ? <Button
                uppercase={false} 
                color={Colors.primary.alpha}
                mode='text'
                onPress={cancel?.handler}
                style={styles.headerCancelButton}>{cancelLabel}</Button>
            : null
        }
        { save && save.handler
            ? <Button
                uppercase={false} 
                color={Colors.primary.alpha}
                mode={save.outline ? 'outlined' : 'contained'}
                onPress={save?.handler}
                disabled={save.validator && !save.validator()}
                style={[styles.headerDoneButton, save.outline ? styles.outlinedHeaderButton : null]}>{saveLabel}</Button>
            : null
        }
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
        padding: 15,
        paddingLeft: 60
    },
    bottomBorder: {
        borderStyle: 'solid',
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
    },
    headerCancelButton: {
        borderRadius: 32
    },
    headerDoneButton: {
        borderRadius: 32
    },
    outlinedHeaderButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
    }
})    