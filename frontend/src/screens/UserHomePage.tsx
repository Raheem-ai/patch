import React, { useEffect, useState, useCallback } from "react";
import { Text, View, ScrollView, StyleSheet, Pressable } from "react-native";
import { userStore, requestStore, bottomDrawerStore, navigationStore} from "../stores/interfaces";
import { Colors, routerNames, ScreenProps } from "../types";
import {parseFullName} from 'parse-full-name';
import HelpRequestCard from "../components/requestCard/helpRequestCard";
import * as Linking from "expo-linking";
import PatchButton from "../components/patchButton";
import { observer } from "mobx-react"

type Props = ScreenProps<'UserHomePage'>;

const UserHomePage = observer(({ navigation, route }: Props) => {

    // useEffect(() => {
    //     (async () => {

    //         // const fgHandle = locationStore.addForegroundCallback((loc) => {
    //         //     console.log('FOREGROUND: ', `${loc.coords.latitude}, ${loc.coords.longitude}`)
    //         // })

    //         const notifSubs = [
    //             // handle getting notifications of these type in the ui (ie fetch latest data for list)
    //             notificationStore.onNotification(PatchEventType.AssignedIncident, () => {

    //             }),
    //             notificationStore.onNotification(PatchEventType.BroadCastedIncident, () => {

    //             })
    //         ];

    //         const notifResSubs = [
    //             // handle users response to these notification type (ie change ui to indicate we're currently en route to an incident)
    //             notificationStore.onNotificationResponse(PatchEventType.AssignedIncident, () => {

    //             }),
    //             notificationStore.onNotificationResponse(PatchEventType.BroadCastedIncident, () => {

    //             })
    //         ];

    //         return () => {
    //             for (const s of notifSubs) {
    //                 notificationStore.offNotification(s)
    //             }

    //             for (const s of notifResSubs) {
    //                 notificationStore.offNotificationResponse(s)
    //             }
    //         }
    //     })();
    //   }, []);


    // const signout = async () => {
    //     await userStoreInst().signOut();

    //     navigation.reset({
    //         index: 0,
    //         routes: [{ name: routerNames.signIn }],
    //     });
    // }

    // const startShift = async () => {
    //     await locationStore.startWatchingLocation();

    //     const tenSecondsFromNow = new Date();
    //     tenSecondsFromNow.setSeconds(new Date().getSeconds() + 10);

    //     await AsyncStorage.setItem(ILocationStore.SHIFT_END_TIME, JSON.stringify(tenSecondsFromNow.getTime()));
    // }

    // const endShift = async () => {
    //     await locationStore.stopWatchingLocation();
    // }

    // const assignHelpRequest = async () => {
    //     await dispatchStore.assignRequest('fake', [ userStoreInst().user.id ]);
    // }

    const userName = parseFullName(userStore().user.name);

    // single names resolve as last name for some reason?!?!
    const firstName = userName.first || userName.last;

    const OpenURLButton = ({ url, label }) => {
        const handlePress = async () => {
            // Checking if the link is supported for links with custom URL scheme.
            const supported = await Linking.canOpenURL(url);
        
            if (supported) {
                // Opening the link with some app; if the URL scheme is "http(s)" it should be opened by a browser
                await Linking.openURL(url);
            }
        };
      
        return <PatchButton mode='text' label={label} onPress={handlePress} />;
    }

    const comingSoon = 'coming soon';
    
    const defaultText = () => { 

        return !requestStore().myActiveRequests.length
            ? <View>
                <Text style={{ fontSize: 16, marginTop: 24 }}>Welcome to Patch. Use the ☰ menu to navigate between sections:</Text>
                <Text style={{ fontSize: 16, marginTop: 24 }}>
                    <Text>Document and dispatch <Text style={{ fontWeight: '900'}}>requests</Text> for help</Text>
                </Text>
                <Text style={{ fontSize: 16, marginTop: 24 }}>
                    <Text>View and manage your <Text style={{ fontWeight: '900'}}>team</Text></Text>
                </Text>
                <Text style={{ fontSize: 16, marginTop: 24 }}>
                    <Text>Use <Text style={{ fontWeight: '900'}}>channels</Text> to communicate with response teams</Text>
                </Text>
            </View>
            : null
    }

    const currentResponse = () => {

        return !!requestStore().myActiveRequests.length
            ? <View>
                <View style={styles.currentResponseSection}>
                    <View style={styles.currentResponseLabelContainer}>
                        <View style={styles.currentResponseIndicator}></View>
                        <Text style={styles.currentResponseText}>Currently responding</Text>
                    </View>
                </View>
                {
                    requestStore().myActiveRequests.map(r => {
                        return (
                            <HelpRequestCard style={styles.activeRequestCard} request={r}/>
                        )
                    })
                }
            </View>
            : null
    }

    return (
        <ScrollView>
            <View  style={{ padding: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: '800', marginTop: 24 }}>{`Hi, ${firstName}.`}</Text>
                {defaultText()}
                {currentResponse()}
            </View>
            <View style={{paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderColor: Colors.borders.formFields}}>
                <OpenURLButton url='https://help.getpatch.org/' label='Documentation' />
                <OpenURLButton url='https://raheemsupport.zendesk.com/hc/en-us/requests/new' label='Support request' />
            </View>
           {/*
            <View>
                <PatchButton 
                    mode='contained'
                    uppercase={false}
                    label='Requests'
                    style={styles.button}
                    onPress={() => { navigateTo(routerNames.helpRequestList) }}/>
                <PatchButton 
                    mode='contained'
                    uppercase={false}r
                    label='Team'
                    style={styles.button}
                    onPress={() => { navigateTo(routerNames.teamList) }}/>
                <PatchButton 
                    mode='contained'
                    uppercase={false}
                    label='Profile'
                    style={styles.button}
                    onPress={() => {
                        userStore().pushCurrentUser(userStore().user);
                        navigateTo(routerNames.userDetails);
                    }}/>
                </View>
                */}
        </ScrollView>
    );
});

export default UserHomePage;

const styles = StyleSheet.create({
    button: {
        marginTop: 24,  
    },
    currentResponseSection: {
        paddingTop: 32,

    },
    currentResponseLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignContent: 'center'
    },
    currentResponseIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: Colors.good,
        alignSelf: 'center',
        marginRight: 8
    },
    currentResponseText: {
        color: Colors.good,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    activeRequestCard: {
        borderRadius: 8,

        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowRadius: 2,
        shadowOffset: {
            width: 0,
            height: 1
        }
    }
})