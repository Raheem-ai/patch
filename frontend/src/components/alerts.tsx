import { observer } from "mobx-react";
import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import { alertStore, IAlertStore } from "../stores/interfaces";
import { HeaderHeight } from "./header/header";



export const Alerts = observer(() => {
    const alertsToShow = !!alertStore().prompt || !!alertStore().toast;

    const prompt = () => {
        const dimensions = Dimensions.get('screen');
        const width = dimensions.width - (2 * 20);
        const top = dimensions.height / 3;
        const left = 20;

        // const singleAction = alertStoreInst().prompt.actions.length == 1;

        return !!alertStore().prompt
            ? <View style={[styles.promptContainer, { width, top, left }]}>
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
            : null
    }

    const toast = () => {

        const width = Dimensions.get('screen').width - (2 * 20);
        const top = HeaderHeight + 20;
        const left = 20;

        return !!alertStore().toast
            ? <View style={[styles.toastContainer, { width, top, left }]}>
                <ScrollView>
                    <Text style={{ color: '#fff' }}>{alertStore().toast.message}</Text>
                </ScrollView>
            </View>
            : null
    }

    if (!alertsToShow) {
        return null
    }

    return <>
        { toast() }
        { prompt() }
    </>
})

export default Alerts;

const styles = StyleSheet.create({
    promptContainer: {
        position: 'absolute',
        padding: 10,
        paddingBottom: 0,
        backgroundColor: 'rgba(17, 17, 17, .8)',
        zIndex: 1000 * 10,
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
        backgroundColor: 'rgba(17, 17, 17, .8)',
        zIndex: 1000 * 10,
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
    promptMessageLabel: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '400'
    },
    promptActionLabel: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '400', 
        alignSelf: 'center'
    },
    promptConfirmActionLabel: {
        fontWeight: '900'
    }
})