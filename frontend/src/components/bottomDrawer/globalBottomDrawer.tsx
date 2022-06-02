import { Route } from "@react-navigation/routers";
import { throws } from "assert";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React, {ComponentClass} from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, IconButton, Text } from "react-native-paper";
import { unwrap } from "../../../../common/utils";
import { isAndroid } from "../../constants";
import { navigateTo, navigationRef } from "../../navigation";
import { BottomDrawerHandleHeight, bottomDrawerStore, headerStore, IBottomDrawerStore, IHeaderStore, IRequestStore, IUserStore, navigationStore, requestStore, userStore } from "../../stores/interfaces";
import { Colors, routerNames } from "../../types";
import { BOTTOM_BAR_HEIGHT } from "../../utils/dimensions";
import { HeaderHeight, InteractiveHeaderHeight } from "../header/header";
import HelpRequestCard from "../requestCard/helpRequestCard";
import Loader from "../loader";

const dimensions = Dimensions.get('screen')

type BottomDrawerProps = { }

@observer
export default class GlobalBottomDrawer extends React.Component<BottomDrawerProps> {
    submitting = observable.box<boolean>(false)

    toggleExpanded = () => {
        if (bottomDrawerStore().expanded) {
            bottomDrawerStore().minimize()
        } else {
            bottomDrawerStore().expand()
        }
    }

    drawer() {

        const submitActionLabel = bottomDrawerStore().view.submit?.label
            ? unwrap(bottomDrawerStore().view.submit.label)
            : null

        const minimizeLabel = bottomDrawerStore().view.minimizeLabel
            ? unwrap(bottomDrawerStore().view.minimizeLabel)
            : null;

        const hasRaisedHeader = bottomDrawerStore().view.raisedHeader
            ? unwrap(bottomDrawerStore().view.raisedHeader)
            : false;

        const ChildView = bottomDrawerStore().view;

        const valid = !!bottomDrawerStore().view.submit?.isValid?.()

        const onSubmit = async () => {
            runInAction(() => {
                this.submitting.set(true)
            })

            try {
                await bottomDrawerStore().view.submit.action()
            } finally {
                runInAction(() => {
                    this.submitting.set(false)
                })
            }
        }

        return (
            <Animated.View key='bottomDrawer' style={[
                styles.container, 
                { 
                    top: bottomDrawerStore().bottomDrawerTabTop,
                    height: dimensions.height 
                        - (minimizeLabel ? HeaderHeight : InteractiveHeaderHeight) 
                        - (isAndroid ? BOTTOM_BAR_HEIGHT : 0)
                },
                bottomDrawerStore().expanded 
                    ? null
                    : styles.minimizedHeader
            ]}>
                { bottomDrawerStore().headerShowing && !this.submitting.get()
                    ? <View style={[
                        styles.headerContainer, 
                        hasRaisedHeader 
                            ? styles.raisedHeader 
                            : null,
                        bottomDrawerStore().expanded 
                            ? null
                            : styles.minimizedHeader
                    ]}>
                        { bottomDrawerStore().expanded
                            ? <View style={styles.closeIconContainer}>
                                <IconButton
                                    onPress={bottomDrawerStore().hide}
                                    style={styles.closeIcon}
                                    icon='close' 
                                    color={styles.closeIcon.color}
                                    size={styles.closeIcon.width} />
                            </View>
                            : minimizeLabel
                                ? <View style={styles.minimizedLabelContainer} onTouchStart={this.toggleExpanded}>
                                    <Text style={styles.minimizedLabel}>{minimizeLabel}</Text>
                                </View>
                                : null
                        }
                        { minimizeLabel
                            ? <View style={styles.toggleExpandedIconContainer}>
                                <IconButton
                                    onPress={this.toggleExpanded}
                                    style={styles.toggleExpandedIcon}
                                    icon={ bottomDrawerStore().expanded ? 'chevron-down' : 'chevron-up'} 
                                    // icon={ bottomDrawerStoreInst().expanded ? 'chevron-down' : 'chevron-up'} 
                                    color={styles.toggleExpandedIcon.color}
                                    size={styles.toggleExpandedIcon.width} />
                            </View>
                            : null
                        }
                        { bottomDrawerStore().view.submit && bottomDrawerStore().expanded 
                            ? <Button 
                                labelStyle={styles.submitButtonLabel}
                                uppercase={false}
                                onPress={onSubmit}
                                color={valid ? styles.submitButton.color : styles.disabledSubmitButton.color}
                                disabled={!valid}
                                style={[styles.submitButton, !valid ? styles.disabledSubmitButton : null]}>{submitActionLabel}</Button>
                            : null
                        }
                    </View>
                    : null
                }
                {
                    this.submitting.get()
                        ? <Loader/>
                        : <ChildView/>
                }
            </Animated.View>
        )
    }

    activeRequest() {
        const onPress = () => {
            if (requestStore().activeRequest?.id != requestStore().currentRequest?.id || navigationStore().currentRoute != routerNames.helpRequestDetails) {
                requestStore().pushRequest(requestStore().activeRequest.id)
                navigateTo(routerNames.helpRequestDetails)
            }
        }

        return (
            <HelpRequestCard 
                key='activeRequestTab' 
                onPress={onPress}
                request={requestStore().activeRequest} 
                style={[
                    styles.activeRequestCard,
                    { zIndex: styles.container.zIndex }
                ]} 
                minimal 
                dark/>
        )
    }

    render() {
        if (!userStore().signedIn || headerStore().isOpen) {
            return null
        }

        const onRequestMap = navigationStore().currentRoute == routerNames.helpRequestMap;

        return (
            <>
                {
                    !bottomDrawerStore().view
                        ? null
                        : this.drawer()
                }
                {
                    requestStore().activeRequest && !onRequestMap
                        ? this.activeRequest()
                        : null
                }
            </>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        width: dimensions.width,
        backgroundColor: '#fff',
        position: 'absolute',
        zIndex: 1000,
        shadowRadius: 3,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowOffset: {
            height: 0,
            width: 0
        }
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        height: BottomDrawerHandleHeight,
    },
    raisedHeader: {
        shadowRadius: 1,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowOffset: {
            height: 2,
            width: 0
        },
        zIndex: 10
    },
    minimizedHeader: {
        borderTopRightRadius: 8,
        borderTopLeftRadius: 8
    },
    closeIconContainer: {
        height: BottomDrawerHandleHeight,
        width: BottomDrawerHandleHeight,
        justifyContent: 'center'
    },
    closeIcon: {
        color: '#c3c3c3',
        width: 30,
        margin: 0,
        alignSelf: 'center',
    },
    toggleExpandedIconContainer: {
        position: 'absolute',
        left: (dimensions.width / 2) - (30 / 2),
        top: -10
    },
    toggleExpandedIcon: {
        color: '#999',
        width: 30,
        margin: 0,
        alignSelf: 'center',
    },
    submitButton: {
        height: BottomDrawerHandleHeight - (2 * 12),
        borderRadius: 24,
        color: '#fff',
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        alignSelf: 'center',
        marginRight: 12,
        fontSize: 12
    },
    disabledSubmitButton: {
        color: '#fff',
        backgroundColor: Colors.primary.delta,
    },
    submitButtonLabel: {
        fontSize: 12, 
        fontWeight: '800'
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
    activeRequestCard: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowRadius: 2,
        shadowOffset: {
            width: 0,
            height: -2
        },
        paddingVertical: 8 
    }
})