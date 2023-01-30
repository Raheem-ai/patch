import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import Form, { CustomFormHomeScreenProps } from "../components/forms/form";
import { NavigationFormInputConfig } from "../components/forms/types";
import { VisualArea } from "../components/helpers/visualArea";
import { ScreenProps, Colors } from "../types";
import TestIds from "../test/ids";
import { appVersion } from "../config";
import STRINGS from "../../../common/strings";

type Props = ScreenProps<'HelpAndInfo'>;

type InfoLinks = [
    NavigationFormInputConfig,
    NavigationFormInputConfig,
    NavigationFormInputConfig,
    NavigationFormInputConfig
]

const HelpAndInfo = ({ navigation, route }: Props) => {

    const links = () => {
        return [
            {
                name: 'helpCenter',
                testID: TestIds.helpAndInfo.navInputs.helpCenter,
                label: STRINGS.HELP_AND_INFO.helpCenterLabel(),
                screen: () => null,
                expandOverride: (expand: () => void) => {
                    // TODO: this should come from config
                    Linking.openURL('https://help.getpatch.org/');
                }
            },
            {
                name: 'fileATicket',
                testID: TestIds.helpAndInfo.navInputs.fileATicket,
                label: STRINGS.HELP_AND_INFO.fileTicketLabel(),
                screen: () => null,
                expandOverride: (expand: () => void) => {
                    // TODO: this should come from config
                    Linking.openURL('google.com');
                }
            },
            {
                name: 'termsOfUse',
                testID: TestIds.helpAndInfo.navInputs.termsOfUse,
                label: STRINGS.HELP_AND_INFO.termsLabel(),
                screen: () => null,
                expandOverride: (expand: () => void) => {
                    // TODO: this should come from config
                    Linking.openURL('https://getpatch.org/terms/');
                }
            },
            {
                name: 'privacyPolicy',
                testID: TestIds.helpAndInfo.navInputs.privacyPolicy,
                label: STRINGS.HELP_AND_INFO.privacyLabel(),
                screen: () => null,
                expandOverride: (expand: () => void) => {
                    // TODO: this should come from config
                    Linking.openURL('https://getpatch.org/privacy/');
                }
            }
        ] as InfoLinks;
    }

    const homeScreen = (params: CustomFormHomeScreenProps) => {
        return (
            <VisualArea>
                <ScrollView showsVerticalScrollIndicator={false} style={[{ flex: 1 }, styles.pageContainer]}>
                    <Pressable onPress={params.onContainerPress} style={{ flex: 1 }}>
                        <View style={styles.versionContainer}>
                            <Text style={styles.versionText}>{STRINGS.HELP_AND_INFO.version(appVersion)}</Text>
                        </View>
                        <View style={{ borderTopColor: Colors.borders.formFields, borderTopWidth: 1 }}>
                            { params.renderInputs(params.inputs())}
                        </View>
                    </Pressable>
                </ScrollView>
            </VisualArea>
        )
    }

    return (
        <Form 
            testID={TestIds.helpAndInfo.form}
            inputs={links()} 
            homeScreen={homeScreen}/>
    )
}

export default HelpAndInfo;

const styles = StyleSheet.create({
    pageContainer: {
        backgroundColor: Colors.backgrounds.settings,
        height: '100%'
    },
    versionContainer: {
        flexDirection: 'row', 
        alignItems: 'center',
        paddingLeft: 60,
        height: 60
    },
    versionText: { 
        color: Colors.text.forms.fieldLabel, 
        fontSize: 16,
        lineHeight: 24
    }
})