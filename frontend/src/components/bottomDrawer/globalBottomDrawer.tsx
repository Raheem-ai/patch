import { observer } from "mobx-react";
import React from "react";
import { Animated, Dimensions, StyleSheet } from "react-native";
import { unwrap } from "../../../../common/utils";
import { HeaderHeight, InteractiveHeaderHeight, isAndroid } from "../../constants";
import { navigateTo } from "../../navigation";
import { BottomDrawerHandleHeight, bottomDrawerStore, headerStore, navigationStore, requestStore, userStore } from "../../stores/interfaces";
import { Colors, routerNames } from "../../types";
import { BOTTOM_BAR_HEIGHT } from "../../utils/dimensions";
import HelpRequestCard from "../requestCard/helpRequestCard";
import Loader from "../loader";
import { BottomDrawerViewVisualArea } from "../helpers/visualArea";

const dimensions = Dimensions.get('screen')

type BottomDrawerProps = { }

@observer
export default class GlobalBottomDrawer extends React.Component<BottomDrawerProps> {
    
    drawer() {
        const isMinimizable = bottomDrawerStore().minimizable;

        const ChildView = bottomDrawerStore().view;

        return (
            <Animated.View key='bottomDrawer' style={[
                styles.container, 
                { 
                    top: bottomDrawerStore().bottomDrawerTabTop,
                    // Note: don't use bottomDrawerStore().drawerContentHeight here because we don't want the container 
                    // resizing as the keyboard opens/closes
                    height: dimensions.height 
                        - (isMinimizable ? HeaderHeight : InteractiveHeaderHeight) 
                        - (isAndroid ? BOTTOM_BAR_HEIGHT : 0)
                },
                bottomDrawerStore().expanded 
                    ? null
                    : styles.minimizedHeader
            ]}>
                {
                    bottomDrawerStore().submitting
                        ? <Loader/>
                        : <BottomDrawerViewVisualArea>
                            <ChildView/>
                        </BottomDrawerViewVisualArea>
                            
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
        // don't show bottom drawer on unauthenticated views or when the header is open
        // need to do this here because this sits as a sibling of the navigator in App.tsx
        if (!userStore().signedIn || headerStore().isOpen) {
            return null
        }

        return (
            <>
                {
                    !bottomDrawerStore().view || !bottomDrawerStore().drawerShouldShow
                        ? null
                        : this.drawer()
                }
                {
                    bottomDrawerStore().activeRequestShowing
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