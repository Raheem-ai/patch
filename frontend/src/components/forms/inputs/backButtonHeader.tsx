import { observer } from "mobx-react"
import React from "react"
import { Dimensions, Pressable, StyleSheet, View } from "react-native"
import { Button, IconButton, Text } from "react-native-paper"
import { unwrap } from "../../../../../common/utils"
import { BottomDrawerHandleHeight, bottomDrawerStore, nativeEventStore } from "../../../stores/interfaces"
import { Colors, ICONS } from "../../../types"

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
    label?: string | (() => string),
    labelDecoration?: {
        handler: () => void,
        icon: string | (()  => string)
    }
    bottomBorder?: boolean,
    bottomDrawerView?: BottomDrawerConfig | boolean
}

type BottomDrawerConfig = {
    minimizeLabel?: string
}

const dimensions = Dimensions.get('screen')

@observer
export default class BackButtonHeader extends React.Component<BackButtonHeaderProps> {

    cancel = async () => {
        // hiding the bottomdrawer hides the keyboard but we can't await on that and the 
        // cancel handler might clear the store while it's view is still visible
        // TODO: the better solution is prolly to expose the async nature of hide/show etc via a Promise api
        await nativeEventStore().hideKeyboard()

        if (this.props.bottomDrawerView) {
            bottomDrawerStore().hide()
        }

        this.props.cancel?.handler()
    }

    save = async () => {
        await nativeEventStore().hideKeyboard()
        this.props.save?.handler()
    }

    toggleExpanded = () => {
        if (bottomDrawerStore().expanded) {
            bottomDrawerStore().minimize()
        } else {
            bottomDrawerStore().expand()
        }
    }

    expandHideButton = () => {
        return (this.props.bottomDrawerView as BottomDrawerConfig)?.minimizeLabel
            ? <View style={{
                position: 'absolute',
                left: (dimensions.width / 2) - (30 / 2),
                top: -10
            }}>
                <IconButton
                    onPress={this.toggleExpanded}
                    style={styles.toggleExpandedIcon}
                    icon={ bottomDrawerStore().expanded ? ICONS.filterOpen : ICONS.filterClose} 
                    color={styles.toggleExpandedIcon.color}
                    size={styles.toggleExpandedIcon.width} />
            </View>
            : null
    }

    cancelButton = () => {
        return this.props.cancel && this.props.cancel.handler
            ? <View style={{ position: "absolute", left: 0, width: 60}}>
                <IconButton
                    onPress={this.cancel}
                    style={styles.closeIcon}
                    icon={ICONS.navCancel} 
                    color={styles.closeIcon.color}
                    size={styles.closeIcon.width} />
            </View>
            : null
    }

    saveButton = () => {
        const saveLabel = unwrap(this.props.save?.label) || 'Done'

        return this.props.save && this.props.save.handler
            ? <Button
                uppercase={false} 
                color={Colors.primary.alpha}
                mode={this.props.save.outline ? 'outlined' : 'contained'}
                onPress={this.save}
                disabled={this.props.save.validator && !this.props.save.validator()}
                style={[styles.headerDoneButton, this.props.save.outline ? styles.outlinedHeaderButton : null]}>{saveLabel}</Button>
            : null
    }

    defaultHeaderLabel = () => {
        const headerLabel = unwrap(this.props.label) || '';

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18 }} >{headerLabel}</Text>
                {
                    this.props.labelDecoration 
                        ? <IconButton
                            onPress={this.props.labelDecoration.handler}
                            icon={this.props.labelDecoration.icon} 
                            color={'#666'}
                            size={20} 
                            style={{ margin: 0, padding: 0, width: 20, marginLeft: 12 }} />
                        : null
                }
            </View>
        )
    }

    defaultHeader = () => {
        return (
            <View style={[
                styles.backButtonHeader, 
                this.props.bottomBorder 
                    ? styles.bottomBorder 
                    : null
            ]}>
                { this.defaultHeaderLabel() }
                { this.expandHideButton() }
                { this.cancelButton() }
                { this.saveButton() }
            </View>
        )
    }

    bottomDrawerHeader = () => {
        return (
            <View style={[
                styles.bottomDrawerBackButtonHeader, 
                this.props.bottomBorder 
                    ? styles.bottomBorder 
                    : null
            ]}>
                {/* { this.defaultHeaderLabel() } */}
                { this.expandHideButton() }
                { this.cancelButton() }
                { this.saveButton() }
            </View>
        )
    }

    bottomDrawerHandle = () => {
        return (
            <Pressable onPress={this.toggleExpanded} style={styles.minimizedLabelContainer}>
                { this.expandHideButton() }
                <Text style={styles.minimizedLabel}>
                    {(this.props.bottomDrawerView as BottomDrawerConfig)?.minimizeLabel}
                </Text>
            </Pressable>
        )
    }

    render() {
        return this.props.bottomDrawerView 
            ? bottomDrawerStore().showing && !bottomDrawerStore().expanded
                ? this.bottomDrawerHandle()
                : this.bottomDrawerHeader()
            : this.defaultHeader()
    }
}

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
    bottomDrawerBackButtonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
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
    },
    closeIcon: {
        color: '#c3c3c3',
        width: 30,
        margin: 0,
        alignSelf: 'center',
    },
    toggleExpandedIcon: {
        color: '#999',
        width: 30,
        margin: 0,
        alignSelf: 'center',
    },
    minimizedLabelContainer: {
        height: BottomDrawerHandleHeight,
        width: '100%',
        justifyContent: 'center'
    },
    minimizedLabel: {
        fontSize: 18,
        color: '#111111',
        fontWeight: 'bold',
        marginLeft: 20
    },
})    