import React from "react";
import { Text, View } from "react-native";
import { Button } from "react-native-paper";
import { userStore } from "../stores/interfaces";
import { Colors, routerNames, ScreenProps } from "../types";
import { navigateTo } from "../navigation";
import {parseFullName} from 'parse-full-name';

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

    const welcomeText = 'Welcome to Patch, the dispatching system for community crisis care.'

    const menuInstructions = 'Use the menu above to get around:'

    const requestDetails = 'create calls for help and add responders'

    const teamDetails = 'add new team members'

    const comingSoon = 'coming soon'

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
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', marginVertical: 20 }}>{`Hi ${firstName}`}</Text>
            <Text style={{ fontSize: 16, marginTop: 4, marginBottom: 20 }}>{welcomeText}</Text>
            <Text style={{ fontSize: 16, marginVertical: 4 }}>{menuInstructions}</Text>
            <Text style={{ fontSize: 16, marginVertical: 4 }}>
                <Text style={{ fontWeight: '900'}}>Requests: </Text>
                <Text>{requestDetails}</Text>
            </Text>

            <Text style={{ fontSize: 16, marginVertical: 4 }}>
                <Text style={{ fontWeight: '900'}}>Team: </Text>
                <Text>{teamDetails}</Text>
            </Text>

            <Text style={{ fontSize: 16, marginVertical: 4, color: '#aaa' }}>
                <Text style={{ fontWeight: '900'}}>Resources: </Text>
                <Text>{comingSoon}</Text>
            </Text>

            <Text style={{ fontSize: 16, marginVertical: 4, color: '#aaa' }}>
                <Text style={{ fontWeight: '900'}}>Schedule: </Text>
                <Text>{comingSoon}</Text>
            </Text>

            <View>
                <Button 
                    uppercase={false}
                    onPress={() => { navigateTo(routerNames.helpRequestMap) }}
                    color={'#fff'}
                    style={{
                        height: 44,
                        borderRadius: 24,
                        backgroundColor: Colors.primary.alpha,
                        justifyContent: 'center',
                        marginTop: 20
                    }}>{'Requests'}</Button>

                <Button 
                    uppercase={false}
                    onPress={() => { navigateTo(routerNames.teamList) }}
                    color={'#fff'}
                    style={{
                        height: 44,
                        borderRadius: 24,
                        backgroundColor: Colors.primary.alpha,
                        justifyContent: 'center',
                        marginTop: 20
                    }}>{'Team'}</Button>

                <Button 
                    uppercase={false}
                    onPress={() => {
                        userStore().pushCurrentUser(userStore().user);
                        navigateTo(routerNames.userDetails);
                    }}
                    color={'#fff'}
                    style={{
                        height: 44,
                        borderRadius: 24,
                        backgroundColor: Colors.primary.alpha,
                        justifyContent: 'center',
                        marginTop: 20
                    }}>{'Profile'}</Button>
                </View>
        </View>
    );
};
