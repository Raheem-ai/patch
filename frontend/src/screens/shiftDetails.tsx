import React from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors, ScreenProps } from "../types";
import { observer } from "mobx-react";

import { wrapScrollView } from 'react-native-scroll-into-view'

const WrappedScrollView = wrapScrollView(ScrollView)

type Props = ScreenProps<'ShiftDetails'>;

const dimensions = Dimensions.get('screen');

const ShiftDetails = observer(({ navigation, route }: Props) => {
    return (<View><Text>Shift Details Placeholder</Text></View>
    );

});

export default ShiftDetails;

const styles = StyleSheet.create({
    detailsContainer: {
        padding: 16,
        paddingTop: 30,
        paddingBottom: 0,
        backgroundColor: Colors.backgrounds.standard,
    },
    toggleRequestContainer: { 
        width: '100%',
        padding: 20,
        paddingTop: 24,
        backgroundColor: Colors.backgrounds.secondary,
        borderTopColor: Colors.borders.formFields,
        borderTopWidth: 1

    },
    notesSection: {
        marginBottom: 16
    },
    priorityOuterSection: {
        marginBottom: 16,
        // makes the inner section hug the text vs trying to dill the space of its container
        flexDirection: 'row' 
    },
    priorityInnerSection: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    timeAndPlaceSection: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    timeAndPlaceRow: {
        flexDirection: 'row',
        marginVertical: 2
    },
    detailsIcon: { 
        width: 16,
        color: Colors.icons.dark,
        alignSelf: 'flex-start',
        marginRight: 4,
        marginLeft: 0,
        paddingLeft: 0,
    },
    metadataText: {
        fontSize: 14,
        alignSelf: 'center',
        color: Colors.text.secondary,
        marginLeft: 4
    },
    headerContainer: {
        marginBottom: 16,
        flexDirection: "row",
        justifyContent: 'space-between'
    },
    typeLabelContainer: {
        flex: 1
    },
    typeLabel: {
        fontSize: 17,
        fontWeight: 'bold'
    },
    editIcon: {
        width: 20,
        height: 20,
        color: '#999',
        alignSelf: 'flex-start',
        margin: 0
    },
    newLabelContainer: {
        borderRadius: 2,
        justifyContent:'center',        
        backgroundColor: '#64B67B'
    },
    newLabel: {
        paddingHorizontal: 5,
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold'
    },
    notifyButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
        backgroundColor: '#fff',
        borderRadius: 32,
        height: 40,
    },
    icon: {
        width: 20,
        height: 20,
        margin: 0
    },
    largeIcon: {
        width: 30,
        height: 30,
        margin: 0
    },
    closeRequestButton: {
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
        borderStyle: 'solid',
        backgroundColor: Colors.backgrounds.standard
    },
    addPositionsButton: {
        backgroundColor: Colors.primary.alpha,
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: 24,
        // margin: 20,
        width: '100%',
        height: 48
    },
    mapView: {
        height: 180,
        marginBottom: 16
    }
})
