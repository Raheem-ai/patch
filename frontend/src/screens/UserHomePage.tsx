import React from "react";
import { Text, View, ScrollView, StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { userStore, requestStore } from "../stores/interfaces";
import { Colors, routerNames, ScreenProps } from "../types";
import { navigateTo } from "../navigation";
import {parseFullName} from 'parse-full-name';
import PatchButton from '../components/patchButton';
import HelpRequestCard from "../components/requestCard/helpRequestCard";

type Props = ScreenProps<'UserHomePage'>;

export default function UserHomePage({ navigation, route }: Props) {
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);

    const closeMenu = () => setVisible(false);

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

    const welcomeText = 'Welcome to Patch.'

    const menuInstructions = 'Use the ☰ menu to get around the app.'

const defaultText = (shouldShow:boolean) => { 

    return (shouldShow &&
            <View>
                <Text style={{ fontSize: 16, marginTop: 24 }}>{welcomeText}</Text>
                <Text style={{ fontSize: 16, marginTop: 24 }}>{menuInstructions}</Text>
            </View>)
}

    const currentResponse = () => {
        if (!requestStore().currentUserActiveRequests.length) {
            return null;
        }

        return <View style={styles.currentResponseSection}>
                <View style={styles.currentResponseLabelContainer}>
                    <View style={styles.currentResponseIndicator}></View>
                    <Text style={styles.currentResponseText}>Responding</Text>
                </View>
                {
                    requestStore().currentUserActiveRequests.map(r => {
                        return (
                            <HelpRequestCard style={styles.activeRequestCard} request={r}/>
                        )
                    })
                }
            </View>
    }


// *******************
// NOT UPDATING
// *******************


    return (
        // <Provider>
        //     <View>
        //         <Menu
        //             visible={visible}
        //             onDismiss={closeMenu}
        //             anchor={<Button onPress={openMenu}>Menu</Button>}>
        //             <Menu.Item title="Requests" />
        //             <Menu.Item title="Chat" />
        //             <Menu.Item title="Resources" />
        //             <Menu.Item title="Schedule" />
        //             <Menu.Item title="Sign Out" onPress={signout}/>
        //         </Menu>
        //         <Button onPress={startShift}>Start Shift</Button>
        //         <Button onPress={endShift}>End Shift</Button>
        //         <Button onPress={assignHelpRequest}>Assign Help Request</Button>
        //     </View>
        // </Provider>
        <ScrollView style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 24 }}>{`Hi ${firstName}!`}</Text>

<Text>{requestStore().currentUserActiveRequests.length}</Text>

            {defaultText(!!!requestStore().currentUserActiveRequests.length)}
            {currentResponse()}
            
            <View>
                <PatchButton 
                    mode='contained'
                    uppercase={false}
                    label='Requests'
                    style={styles.button}
                    onPress={() => { navigateTo(routerNames.helpRequestList) }}/>
                <PatchButton 
                    mode='contained'
                    uppercase={false}
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
        </ScrollView>
    );
};

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