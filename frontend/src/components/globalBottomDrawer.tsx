import { Route } from "@react-navigation/routers";
import { throws } from "assert";
import { observer } from "mobx-react";
import React, {ComponentClass} from "react";
import { Animated, Dimensions, SafeAreaView, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { ActiveRequestTabHeight } from "../constants";
import { navigateTo, navigationRef } from "../navigation";
import { BottomDrawerHandleHeight, IBottomDrawerStore, IHeaderStore, IRequestStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { Colors, routerNames } from "../types";
import { HeaderHeight, InteractiveHeaderHeight } from "./header/header";
import HelpRequestCard from "./helpRequestCard";

const dimensions = Dimensions.get('screen')

type BottomDrawerProps = { }

@observer
export default class GlobalBottomDrawer extends React.Component<BottomDrawerProps> {

    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    userStore = getStore<IUserStore>(IUserStore);
    requestStore = getStore<IRequestStore>(IRequestStore);
    headerStore = getStore<IHeaderStore>(IHeaderStore);

    toggleExpanded = () => {
        if (this.bottomDrawerStore.expanded) {
            this.bottomDrawerStore.minimize()
        } else {
            this.bottomDrawerStore.expand()
        }
    }

    drawer() {
        const submitActionLabel = this.bottomDrawerStore.view.submit?.label
            ? typeof this.bottomDrawerStore.view.submit.label == 'function'
                ? this.bottomDrawerStore.view.submit.label()
                : this.bottomDrawerStore.view.submit.label
            : null

        const minimizeLabel = this.bottomDrawerStore.view.minimizeLabel
            ? typeof this.bottomDrawerStore.view.minimizeLabel == 'function'
                ? this.bottomDrawerStore.view.minimizeLabel()
                : this.bottomDrawerStore.view.minimizeLabel
            : null;

        const hasRaisedHeader = this.bottomDrawerStore.view.raisedHeader
            ? typeof this.bottomDrawerStore.view.raisedHeader == 'function'
                ? this.bottomDrawerStore.view.raisedHeader()
                : this.bottomDrawerStore.view.raisedHeader
            : false;

        const ChildView = this.bottomDrawerStore.view;

        return (
            <Animated.View key='bottomDrawer' style={[
                styles.container, 
                { 
                    top: this.bottomDrawerStore.bottomDrawerTabTop,
                    height: dimensions.height - (minimizeLabel ? HeaderHeight : InteractiveHeaderHeight)
                },
                this.bottomDrawerStore.expanded 
                    ? null
                    : styles.minimizedHeader
            ]}>
                { this.bottomDrawerStore.headerShowing 
                    ? <View style={[
                        styles.headerContainer, 
                        hasRaisedHeader 
                            ? styles.raisedHeader 
                            : null,
                        this.bottomDrawerStore.expanded 
                            ? null
                            : styles.minimizedHeader
                    ]}>
                        { this.bottomDrawerStore.expanded
                            ? <View style={styles.closeIconContainer}>
                                <IconButton
                                    onPress={this.bottomDrawerStore.hide}
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
                                    icon={ this.bottomDrawerStore.expanded ? 'chevron-down' : 'chevron-up'} 
                                    // icon={ this.bottomDrawerStore.expanded ? 'chevron-down' : 'chevron-up'} 
                                    color={styles.toggleExpandedIcon.color}
                                    size={styles.toggleExpandedIcon.width} />
                            </View>
                            : null
                        }
                        { this.bottomDrawerStore.view.submit && this.bottomDrawerStore.expanded 
                            ? <Button 
                                labelStyle={styles.submitButtonLabel}
                                uppercase={false}
                                onPress={this.bottomDrawerStore.view.submit.action}
                                color={styles.submitButton.color}
                                style={styles.submitButton}>{submitActionLabel}</Button>
                            : null
                        }
                    </View>
                    : null
                }
                <ChildView/>
            </Animated.View>
        )
    }

    activeRequest() {
        const onPress = () => {
            if (this.requestStore.activeRequest?.id != this.requestStore.currentRequest?.id || this.bottomDrawerStore.currentRoute != routerNames.helpRequestDetails) {
                this.requestStore.pushRequest(this.requestStore.activeRequest.id)
                navigateTo(routerNames.helpRequestDetails)
            }
        }

        return (
            <HelpRequestCard 
                key='activeRequestTab' 
                onPress={onPress}
                request={this.requestStore.activeRequest} 
                style={[
                    styles.activeRequestCard,
                    { zIndex: styles.container.zIndex }
                ]} 
                minimal 
                dark/>
        )
    }

    render() {
        if (!this.userStore.signedIn || this.headerStore.isOpen) {
            return null
        }

        const onRequestMap = this.bottomDrawerStore.currentRoute == routerNames.helpRequestMap;

        return (
            <>
                {
                    !this.bottomDrawerStore.view
                        ? null
                        : this.drawer()
                }
                {
                    this.requestStore.activeRequest && !onRequestMap
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
        } 
    }
})