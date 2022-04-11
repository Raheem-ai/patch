import { observer } from "mobx-react";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { IconButton, Text } from "react-native-paper";
import Form, { CustomFormHomeScreenProps } from "../components/forms/form";
import DescriptiveNavigationLabel from "../components/forms/inputs/descriptiveNavigationLabel";
import MangeRolesForm from "../components/forms/manageRolesForm";
import { Grouped, InlineFormInputConfig, NavigationFormInputConfig, ScreenFormInputConfig, SectionNavigationLabelViewProps, SectionNavigationScreenViewProps, StandAloneFormInputConfig } from "../components/forms/types";
import UpsertRoleForm from "../components/forms/upsertRoleForm";
import { VisualArea } from "../components/helpers/visualArea";
import { resolveErrorMessage } from "../errors";
import { alertStore, organizationStore, upsertRoleStore } from "../stores/interfaces";
import { ScreenProps } from "../types";

type Props = ScreenProps<'Settings'>;

type OrganizationSettingsInputs = [
    InlineFormInputConfig<'TextInput'>,
    InlineFormInputConfig<'TextInput'>,
    NavigationFormInputConfig,
    NavigationFormInputConfig,
    NavigationFormInputConfig,
    ScreenFormInputConfig<'TextArea'>,
    InlineFormInputConfig<'Switch'>,
    InlineFormInputConfig<'Switch'>
]

type PersonalSettingsInputs = [
    InlineFormInputConfig<'Switch'>,
    InlineFormInputConfig<'Switch'>
]

const Settings = observer(({ navigation, route }: Props) => {

    const personalSettings = () => {
        // TODO: plumb these through to the user model 
        const inputs = [
            {
                name: 'appNotifications',
                type: 'Switch',
                val: () => true,
                isValid: () => true,
                onChange: (val) => {},
                disabled: true,
                props: {
                    label: 'App notifications'
                }
            },
            {
                name: 'smsNotifications',
                type: 'Switch',
                val: () => true,
                isValid: () => true,
                onChange: (val) => {},
                disabled: true,
                props: {
                    label: 'SMS notifications'
                }
            }
        ] as PersonalSettingsInputs

        return inputs
    }

    const organizationSettings = () => {
        // TODO: make this switch what you see based on permissions
        const inputs = [
            
                // TODO: plumb down to organization
                {
                    name: 'orgName',
                    type: 'TextInput',
                    val: () => organizationStore().metadata.name,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    placeholderLabel: () => 'Organization name'
                },
                // TODO: plumb down to organization
                {
                    name: 'requestPrefix',
                    type: 'TextInput',
                    val: () => organizationStore().requestPrefix,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    placeholderLabel: () => 'Request prefix'
                },
                {
                    name: 'manageRoles',
                    label: ({ expand }) => {
                        return <DescriptiveNavigationLabel 
                                    expand={expand} 
                                    name={'Roles + permissions'} 
                                    description={'Decide who can do what'} />
                    },
                    screen: ({ back }) => {
                        return <MangeRolesForm back={back} />
                    }
                },
                {
                    name: 'manageAttributes',
                    label: ({ expand }) => {
                        return <DescriptiveNavigationLabel 
                                    expand={expand} 
                                    name={'Attributes'} 
                                    description={'Describe team members'} />
                    },
                    screen: ({ back }) => {
                        return null
                    }
                },
                {
                    name: 'manageTags',
                    label: ({ expand }) => {
                        return <DescriptiveNavigationLabel 
                                    expand={expand} 
                                    name={'Tags'} 
                                    description={'Add context to requests'} />
                    },
                    screen: ({ back }) => {
                        return null
                    }
                },
                {
                    onSave: (text) => {
                        
                    },
                    val: () => {
                        return ''
                    },
                    isValid: () => {
                        return true
                    },
                    name: 'welcomeMessage',
                    previewLabel: () => '',
                    headerLabel: () => 'Welcome message',
                    placeholderLabel: () => 'Welcome message for new users',
                    type: 'TextArea'
                },
                {
                    name: 'createRequestChats',
                    type: 'Switch',
                    val: () => true,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    props: {
                        label: 'Create chats for Requests'
                    }
                },
                {
                    name: 'createShiftChats',
                    type: 'Switch',
                    val: () => false,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: false,
                    props: {
                        label: 'Create chats for Shifts'
                    }
                }
            
        ] as OrganizationSettingsInputs

        return inputs;
    }

    const homeScreen = (params: CustomFormHomeScreenProps) => {
        const inputs = params.inputs();

        return (
            <VisualArea>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <Pressable onPress={params.onContainerPress} style={{ flex: 1, paddingBottom: 20 }}>
                        <View style={styles.headerContainer}>
                            <IconButton
                                icon={'account'} 
                                color='#666'
                                size={20} 
                                style={styles.headerIcon} />
                            <Text style={styles.headerText}>{'PERSONAL'}</Text>
                        </View>
                        <View style={{ borderTopColor: '#ccc', borderTopWidth: 1 }}>
                            { params.renderInputs([inputs[0]])}
                        </View>
                        <View style={styles.headerContainer}>
                            <IconButton
                                icon={'domain'} 
                                color='#666'
                                size={20} 
                                style={styles.headerIcon} />
                            <Text style={styles.headerText}>{'ORGANIZATION'}</Text>
                        </View>
                        <View style={{ borderTopColor: '#ccc', borderTopWidth: 1 }}>
                            { params.renderInputs([inputs[1]])}
                        </View>
                    </Pressable>
                </ScrollView>
            </VisualArea>
        )
    }

    return (
        <Form 
            inputs={[ personalSettings(), organizationSettings() ]} 
            homeScreen={homeScreen}/>
    )
})

export default Settings;

const styles = StyleSheet.create({
    headerContainer: {
        marginTop: 40, 
        marginBottom: 20, 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    headerText: { 
        color: '#666', 
        fontSize: 16 
    },
    headerIcon: { 
        margin: 0, 
        padding: 0, 
        width: 20, 
        marginHorizontal: 20 
    }
})