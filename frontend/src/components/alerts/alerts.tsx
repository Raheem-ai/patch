import { observer } from "mobx-react";
import React from "react";
import { Dimensions, Pressable, StyleSheet, View, GestureResponderEvent } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import { HeaderHeight, TabbedScreenHeaderHeight } from "../../constants";
import { alertStore, headerStore, IAlertStore, userStore } from "../../stores/interfaces";
import { Colors } from "../../types";

export const Alerts = observer(() => {
    const alertsToShow = !!alertStore().prompt || !!alertStore().toast;

    const backgroundTap = (event: GestureResponderEvent) => {
        alertStore().hideAlerts();
        event.stopPropagation();
    }

    const prompt = () => {
        const dimensions = Dimensions.get('screen');
        const width = dimensions.width - (2 * 20);
        // const top = dimensions.height / 3;
        const top = HeaderHeight + TabbedScreenHeaderHeight + 20;

        const left = 20;

        // const singleAction = alertStoreInst().prompt.actions.length == 1;

        return !!alertStore().prompt
            ? <> 
            <View style={[styles.promptContainer, { width, top, left }]}>
                <View style={[styles.promptTitleContainer]}>
                    <Text style={styles.promptTitleLabel}>{alertStore().prompt.title}</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.promptMessageLabel}>{alertStore().prompt.message}</Text>
                </ScrollView>
                <View style={[styles.promptActionsContainer]}>
                    { 
                        alertStore().prompt.actions.map(a => {
                            const onPress = () => {
                                alertStore().hidePrompt()
                                a.onPress()
                            }

                            return (
                                <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center' }}>
                                    <Pressable onPress={onPress}>
                                        <Text style={[styles.promptActionLabel, a.confirming ? styles.promptConfirmActionLabel : null]}>{a.label}</Text>
                                    </Pressable>
                                </View>
                            )
                        }) 
                    }
                </View>
            </View>
            <Pressable onPress={backgroundTap} style={ styles.promptBackground }></Pressable>
            </>
            : null
    }

    const toast = () => {

        const width = Dimensions.get('screen').width - (2 * 20);
        const top = HeaderHeight + TabbedScreenHeaderHeight + 20;
        const left = 20;

        return !!alertStore().toast
            ? <>
            <View style={[styles.toastContainer, { width, top, left }]}>
                <ScrollView>
                    <Text style={{ color: Colors.text.defaultReversed }}>{alertStore().toast.message}</Text>
                </ScrollView>
            </View>
            <Pressable onPress={backgroundTap} style={ styles.promptBackground }></Pressable>
            </>

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
    promptActionsContainer: {
        minHeight: 60,
        maxHeight: 82,
        flexDirection: 'row',
        // paddingVertical: 8
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
        alignSelf: 'center'
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