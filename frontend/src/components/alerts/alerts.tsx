import { observer } from "mobx-react";
import React from "react";
import { Dimensions, Pressable, StyleSheet, View, GestureResponderEvent, Animated } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text, IconButton } from "react-native-paper";
import { HeaderAnnouncementHeight, HeaderHeight, TabbedScreenHeaderHeight } from "../../constants";
import { alertStore, connectionStore, headerStore, IAlertStore, userStore } from "../../stores/interfaces";
import TestIds from "../../test/ids";
import { Colors, ICONS } from "../../types";

export const Alerts = observer(() => {
    const alertsToShow = !!alertStore().prompt || !!alertStore().toast;

    const backgroundTap = (event: GestureResponderEvent) => {
        alertStore().hideAlerts();
        event.stopPropagation();
    }

    const prompt = () => {
        if (!alertStore().prompt) {
            return null;
        }

        const msg = alertStore().prompt.message;

        const promptMessage = typeof msg == 'function'
            ? msg(styles.promptMessageLabel)
            : <Text testID={TestIds.alerts.prompt} style={styles.promptMessageLabel}>{msg}</Text>

        return (
            <> 
                <Animated.View style={[styles.promptContainer, { 
                    width: alertStore().alertWidth, 
                    left: alertStore().alertLeft,
                    top: alertStore().alertTop 
                }]}>
                    <View style={[styles.promptTitleContainer]}>
                        <Text style={styles.promptTitleLabel}>{alertStore().prompt.title}</Text>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        { promptMessage }
                    </ScrollView>
                    <View style={[styles.promptActionsContainer]}>
                        { 
                            alertStore().prompt.actions.map(a => {
                                const onPress = () => {
                                    alertStore().hidePrompt()
                                    a.onPress()
                                }

                                return (
                                    <View style={[
                                        styles.promptActionsItemContainer, a.confirming
                                            ? { flexGrow: 0,
                                                flexShrink: 1,
                                                paddingRight: 12, }
                                            : null]}>
                                        <Pressable onPress={onPress}>
                                            <Text testID={a.testID ? a.testID : null} style={[
                                                styles.promptActionLabel, 
                                                a.confirming 
                                                    ? styles.promptConfirmActionLabel 
                                                    : null]}>{a.label}</Text>
                                        </Pressable>
                                    </View>
                                )
                            }) 
                        }
                    </View>
                </Animated.View>
                <Pressable onPress={backgroundTap} style={ styles.promptBackground }></Pressable>
            </>
        )
    }

    const toast = () => {
        return !!alertStore().toast
            ? <Animated.View style={[styles.toastContainer, { 
                width: alertStore().alertWidth, 
                left: alertStore().alertLeft,
                top: alertStore().alertTop 
            }]}>
               <Pressable style={[{height: '100%', width: '100%'}]} onPress={() => alertStore().hideToast()}>
                    <ScrollView>
                        <Text testID={TestIds.alerts.toast} style={styles.toastText}>{alertStore().toast.message}</Text>
                    </ScrollView>
                </Pressable>
            </Animated.View>
            : null
    }

    if (!alertsToShow) {
        return null
    }

    // don't show alerts on unauthenticated views, unless explicitely instructed to, or when the header is open
    // need to do this here because this sits as a sibling of the navigator in App.tsx
    if ((!userStore().signedIn && !alertStore().toast?.unauthenticated) || headerStore().isOpen) {
        return null
    }

    return <>
        { toast() }
        { prompt() }
    </>
})

export default Alerts;

const zIdx = 1000 * 10;

const styles = StyleSheet.create({
    promptContainer: {
        position: 'absolute',
        padding: 16,
        paddingBottom: 0,
        backgroundColor: 'rgba(17, 17, 17, .85)',
        zIndex: zIdx,
        borderRadius: 8, 
        shadowColor: '#000',
        shadowOpacity: .15,
        shadowRadius: 4,
        shadowOffset: {
            width: 0,
            height: 4
        },
        maxHeight: 240
    },  
    toastContainer: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'row',
        padding: 20,
        backgroundColor: 'rgba(17, 17, 17, .85)',
        zIndex: zIdx,
        borderRadius: 8, 
        shadowColor: '#000',
        shadowOpacity: .15,
        shadowRadius: 4,
        shadowOffset: {
            width: 0,
            height: 4
        },
        maxHeight: 240
    },
    toastText: { 
        color: Colors.text.defaultReversed,
        padding: 0,
        marginVertical: 4,
        alignSelf: 'flex-start'
    },
    promptActionsContainer: {
        minHeight: 60,
        maxHeight: 82,
        flexDirection: 'row',
        // paddingVertical: 8
    },
    promptActionsItemContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center', 
        flexGrow: 1,
        flexShrink: 0,
        paddingRight: 48,
    },
    promptTitleContainer: {
        marginBottom: 4
    },
    promptTitleLabel: {
        fontSize: 14,
        color: Colors.text.defaultReversed,
        fontWeight: '800'
    },
    promptMessageLabel: {
        fontSize: 14,
        color: Colors.text.defaultReversed,
        fontWeight: '400'
    },
    promptActionLabel: {
        fontSize: 14,
        color: Colors.text.defaultReversed,
        fontWeight: '400', 
        alignSelf: 'center',
    },
    promptConfirmActionLabel: {
        fontWeight: '900'
    },
    promptBackground: {
        position: 'absolute', 
        left: 0, 
        top: 0, 
        width: '100%', 
        height: '100%', 
        backgroundColor:'rgba(0,0,0,0.3)', 
        zIndex: zIdx - 1
    }
})