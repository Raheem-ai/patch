import React from "react";
import { Dimensions, GestureResponderEvent, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest, RequestStatus, RequestStatusToLabelMap } from "../../../common/models";
import { assignedResponderBasedRequestStatus } from "../../../common/utils/requestUtils";
import { IRequestStore } from "../stores/interfaces";
import PartiallyAssignedIcon from "./icons/partiallyAssignedIcon";

export const RequestStatusToIconMap: { [key in RequestStatus]: string | ((onPress: (event: GestureResponderEvent) => void, style?: StyleProp<ViewStyle>, large?: boolean, dark?: boolean) => JSX.Element) } = {
    [RequestStatus.Unassigned]: (onPress: (event: GestureResponderEvent) => void, style?: StyleProp<ViewStyle>, large?: boolean, dark?: boolean) => {
        return (
            <PartiallyAssignedIcon 
                frontColor={dark ? styles.darkStatusIcon.backgroundColor : styles.statusIcon.backgroundColor} 
                backColor={dark ? styles.darkStatusIcon.backgroundColor : '#999'} 
                innerSize={large ? 28 : 16} 
                totalSize={large ? 44 : 28}
                onPress={onPress}
                style={[
                    {
                        marginLeft: large ? 42 : 4,
                        borderColor: dark ? styles.darkStatusIcon.backgroundColor : styles.statusIcon.backgroundColor
                    }, 
                    large 
                        ? { borderWidth: 2 }
                        : null,
                    style
                ]}/>
        )
    },
    [RequestStatus.PartiallyAssigned]: (onPress: (event: GestureResponderEvent) => void, style?: StyleProp<ViewStyle>, large?: boolean, dark?: boolean) => {
        return (
            <PartiallyAssignedIcon 
                frontColor={(dark ? styles.darkStatusIcon : styles.statusIcon).backgroundColor} 
                backColor={dark ? '#fff' : '#999'} 
                innerSize={large ? 28 : 16} 
                totalSize={large ? 44 : 28}
                onPress={onPress}
                style={[
                    {
                        marginLeft: large ? 42 : 4,
                        borderColor: dark ? styles.darkStatusIcon.backgroundColor : styles.statusIcon.backgroundColor
                    }, 
                    large 
                        ? { borderWidth: 2 }
                        : null,
                    style
                ]}/>
        )
    },
    [RequestStatus.Ready]: 'account-multiple',
    [RequestStatus.OnTheWay]: 'arrow-right',
    [RequestStatus.OnSite]: 'map-marker',
    [RequestStatus.Done]: 'check',
    // TODO: which icon, if any?
    [RequestStatus.Closed]: 'check',
}

type StatusIconProps = { 
    status: RequestStatus, 
    onPress: (event: GestureResponderEvent) => void, 
    style?: StyleProp<ViewStyle>,
    large?: boolean,
    dark?: boolean,
    toGo?: boolean
}

export const StatusIcon = ({ 
    status, 
    onPress, 
    style,
    large,
    dark,
    toGo
}: StatusIconProps) => {
    const potentialIcon = RequestStatusToIconMap[status];

    return typeof potentialIcon == 'string' 
        ? <IconButton
            onPress={onPress}
            style={[styles.statusIcon, large ? styles.largeStatusIcon : null , dark ? styles.darkStatusIcon : null , style]}
            icon={potentialIcon} 
            color={(dark 
                ? toGo 
                    ? styles.darkStatusIconToGo
                    : styles.darkStatusIcon 
                : styles.statusIcon).color}
            size={large ? 28 : 16} />
        : potentialIcon(onPress, style, large, dark)
}

type StatusSelectorProps = { 
    request: HelpRequest, 
    requestStore: IRequestStore, 
    style?: StyleProp<ViewStyle>,
    onStatusUpdated?: () => void,
    large?: boolean,
    dark?: boolean,
    withLabels?: boolean
}

export const StatusSelector = ({ 
    request, 
    requestStore, 
    onStatusUpdated,
    large,
    style, 
    dark,
    withLabels
} : StatusSelectorProps) => {
    const firstStatus = assignedResponderBasedRequestStatus(request);

    const dimensions = Dimensions.get('screen');

    const statuses = [firstStatus, RequestStatus.OnTheWay, RequestStatus.OnSite, RequestStatus.Done];

    const currentStatusIdx = statuses.indexOf(request.status);

    const updateStatus = (status: RequestStatus) => async () => {
        if (status != request.status) {
            switch (status) {
                case RequestStatus.OnTheWay:
                case RequestStatus.OnSite:
                case RequestStatus.Done:
                    await requestStore.setRequestStatus(request.id, status);
                    break;
                default:
                    await requestStore.resetRequestStatus(request.id);
                    break;
            }
        }

        onStatusUpdated?.()
    }

    const noMarginIconStyles: StyleProp<ViewStyle> = {
        marginLeft: 0
    }

    const toGoStatusIconStyles: StyleProp<ViewStyle> = [
        noMarginIconStyles,
        { 
            backgroundColor: dark ? styles.darkToGoStatusSelectorDivider.borderBottomColor : styles.toGoStatusSelectorDivider.borderBottomColor,
            borderColor: dark ? styles.darkToGoStatusSelectorDivider.borderBottomColor : styles.toGoStatusSelectorDivider.borderBottomColor
        }
    ]

    return (
        <View style={[]}>
            <View style={[styles.statusSelector, style]}>
                { statuses.map((s, i) => {
                    const potentialLabel = RequestStatusToLabelMap[s];
            
                    const label = typeof potentialLabel == 'string'
                        ? potentialLabel
                        : potentialLabel(request);
                        
                    const oldStatusIcon = () => {
                        return <StatusIcon dark={dark} large={large} status={s}  onPress={updateStatus(s)} style={noMarginIconStyles}/>;
                    }

                    const oldIconDivider = () => {
                        return <View style={[styles.statusSelectorDivider, large ? styles.largeStatusSelectorDivider : null, dark ? styles.darkStatusSelectorDivider : null]}/>
                    }

                    const toGoStatusIcon = () => {
                        return <StatusIcon toGo dark={dark} large={large} status={s}  onPress={updateStatus(s)} style={toGoStatusIconStyles}/>
                    }

                    const toGoIconDivider = () => {
                        return (
                            <View style={[styles.statusSelectorDivider, styles.toGoStatusSelectorDivider, dark ? styles.darkToGoStatusSelectorDivider : null, large ? styles.largeToGoStatusSelectorDivider : null ]}>
                                <View style={[{ 
                                    height: large 
                                        ? styles.largeToGoStatusSelectorDivider.borderBottomWidth 
                                        : styles.toGoStatusSelectorDivider.borderBottomWidth, 
                                    overflow: 'hidden'
                                }]}>
                                    <View style={[{ 
                                        height: (large 
                                            ? styles.largeToGoStatusSelectorDivider.borderBottomWidth 
                                            : styles.toGoStatusSelectorDivider.borderBottomWidth) + 1, 
                                        borderWidth: (large 
                                            ? styles.largeToGoStatusSelectorDivider.borderBottomWidth 
                                            : styles.toGoStatusSelectorDivider.borderBottomWidth), 
                                        borderColor: (dark 
                                            ? styles.darkToGoStatusSelectorDivider.borderBottomColor
                                            : styles.toGoStatusSelectorDivider.borderBottomColor), 
                                        borderStyle: styles.toGoStatusSelectorDivider.borderStyle 
                                    }]}/>
                                </View>
                            </View>
                        )
                    }

                    const resolveStatusIcon = () => {
                        return i == 0
                            ? oldStatusIcon()
                            : currentStatusIdx >= i 
                                ? oldStatusIcon()
                                : toGoStatusIcon()
                    }

                    const resolveStatusIconDivider = () => {
                        return currentStatusIdx > i 
                                ? oldIconDivider()
                                : toGoIconDivider()
                    }

                    // TODO: add key here at some point
                    return i < (statuses.length - 1)
                        ? <>
                            {resolveStatusIcon()}
                            {resolveStatusIconDivider()}
                        </>
                        : resolveStatusIcon()
                })}
            </View>
            {
                withLabels 
                    ? <View style={{ flexDirection: 'row', position: "absolute", bottom: -20 }}> 
                        {   statuses.map((s, i) => {
                                const potentialLabel = RequestStatusToLabelMap[s];
        
                                const label = typeof potentialLabel == 'string'
                                    ? potentialLabel
                                    : potentialLabel(request);

                                // TODO: this is assuming it's always the width of the screen...take totalWidth as a prop
                                // same thing for the padding
                                const middleWidth = ((dimensions.width - (2 * 20) - (4 * styles.largeStatusIcon.width)) / 3) + styles.largeStatusIcon.width;
                                const edgeWidth = (20 * 2) + styles.largeStatusIcon.width;

                                const width = i == 0 || i == statuses.length - 1
                                    // edges
                                    ? edgeWidth
                                    // middle
                                    : middleWidth

                                const edgeGap = (middleWidth - edgeWidth) / 2;

                                const marginStyle = i == 0 
                                    ? { marginRight: edgeGap }
                                    : i == statuses.length - 1
                                        ? { marginLeft: edgeGap }
                                        : {}

                                return <View style={[{ width: width }, marginStyle]}>
                                    <Text style={[{ color: (dark ? styles.darkStatusIcon : styles.statusIcon).borderColor, textAlign: 'center' }, request.status == s ? { fontWeight: 'bold' } : null ]}>{label}</Text>
                                </View>
                            })
                        }
                    </View>
                    : null
            }
        </View>
    )
}

const styles = StyleSheet.create({ 
    statusIcon: {
        color: '#fff',
        backgroundColor: '#000',
        width: 28,
        height: 28,
        borderRadius: 20,
        margin: 0,
        marginLeft: 4,
        borderColor:'#000',
        borderStyle: 'solid',
        borderWidth: 1
    }, 
    largeStatusIcon: {
        width: 44,
        height: 44,
        borderRadius: 40,
        marginLeft: 42
    },
    darkStatusIcon: {
        borderColor:'#333333',
        color: '#fff',
        backgroundColor: '#333333',
    },
    darkStatusIconToGo: {
        color: '#C3C3C3'
    },
    statusSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around'
    },
    statusSelectorDivider: {
        height: 15,
        flex: 1,
        borderBottomColor: '#000',
        borderBottomWidth: 2,
        borderStyle: 'solid',
    },
    darkStatusSelectorDivider: {
        borderBottomColor: '#C3C3C3',
    },
    toGoStatusSelectorDivider: {
        height: 17,
        justifyContent: 'flex-end',
        borderBottomColor: '#ccc',
        borderBottomWidth: 2,
        borderStyle: 'dotted', 
    },
    darkToGoStatusSelectorDivider: {
        borderBottomColor: '#ECEBEC',
        borderBottomWidth: 2,
        borderStyle: 'dotted', 
    },
    largeStatusSelectorDivider: {
        height: 25,
        borderBottomWidth: 2,
    },
    largeToGoStatusSelectorDivider: {
        height: 29,
        borderBottomWidth: 4
    }
})