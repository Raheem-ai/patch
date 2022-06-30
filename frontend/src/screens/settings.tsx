import { observer } from "mobx-react";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { IconButton, Text } from "react-native-paper";
import { PatchPermissions } from "../../../common/models";
import Form, { CustomFormHomeScreenProps } from "../components/forms/form";
import DescriptiveNavigationLabel from "../components/forms/inputs/descriptiveNavigationLabel";
import MangeRolesForm from "../components/forms/editRolesForm";
import { InlineFormInputConfig, NavigationFormInputConfig, ScreenFormInputConfig, SectionNavigationLabelViewProps, SectionNavigationScreenViewProps, StandAloneFormInputConfig } from "../components/forms/types";
import { VisualArea } from "../components/helpers/visualArea";
import { manageAttributesStore, manageTagsStore, organizationStore } from "../stores/interfaces";
import { ScreenProps, Colors } from "../types";
import { iHaveAnyPermissions, iHaveAllPermissions } from "../utils";
import EditCategorizedItemForm from "../components/forms/editCategorizedItemForm";

type Props = ScreenProps<'Settings'>;

type PersonalSettingsInputs = [
    InlineFormInputConfig<'Switch'>,
    InlineFormInputConfig<'Switch'>
]

const Settings = ({ navigation, route }: Props) => {

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
            /*
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
            }*/
        ] as PersonalSettingsInputs

        return inputs
    }

    const organizationSettings = () => {

        const canEditOrgSettings = iHaveAllPermissions([PatchPermissions.EditOrgSettings])

        const inputs = [
            // TODO: plumb down to organization
            canEditOrgSettings
                ? {
                    name: 'orgName',
                    type: 'TextInput',
                    val: () => organizationStore().metadata.name,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    placeholderLabel: () => 'Organization name'
                } as InlineFormInputConfig<'TextInput'>
                : null,
            // TODO: plumb down to organization
            /*
            canEditOrgSettings
                ? {
                    name: 'requestPrefix',
                    type: 'TextInput',
                    val: () => organizationStore().requestPrefix,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    placeholderLabel: () => 'Request prefix'
                } as InlineFormInputConfig<'TextInput'>
                : null,
            */
            iHaveAllPermissions([PatchPermissions.RoleAdmin]) 
                ? {
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
                } as NavigationFormInputConfig
                : null,
            iHaveAllPermissions(manageAttributesStore().editPermissions) 
                ? {
                    name: 'manageAttributes',
                    label: ({ expand }) => {
                        return <DescriptiveNavigationLabel 
                                    expand={expand} 
                                    name={'Attributes'} 
                                    description={'Describe team members'} />
                    },
                    screen: ({ back }) => {
                        return (
                            <VisualArea>
                                <EditCategorizedItemForm 
                                    back={back}
                                    onSaveToastLabel={'Successfully updated Attributes'} 
                                    editHeaderLabel='Edit attributes'
                                    addCategoryPlaceholderLabel='ADD ATTRIBUTE CATEGORY'
                                    addItemPlaceholderLabel={'Add attribute'}
                                    store={manageAttributesStore().editStore}/>
                            </VisualArea>
                        )
                    }
                } as NavigationFormInputConfig
                : null,
            iHaveAllPermissions(manageTagsStore().editPermissions) 
                ? {
                    name: 'manageTags',
                    label: ({ expand }) => {
                        return <DescriptiveNavigationLabel 
                                    expand={expand} 
                                    name={'Tags'} 
                                    description={'Add context to requests'} />
                    },
                    screen: ({ back }) => {
                        return (
                            <VisualArea>
                                <EditCategorizedItemForm 
                                    back={back} 
                                    onSaveToastLabel={'Successfully updated Tags'} 
                                    editHeaderLabel='Edit tags'
                                    addCategoryPlaceholderLabel='ADD TAG CATEGORY'
                                    addItemPlaceholderLabel={'Add tag'}
                                    store={manageTagsStore().editStore} />
                            </VisualArea>
                        )
                    }
                } as NavigationFormInputConfig
                : null,
            // TODO: plumb down to organization
            /*
            canEditOrgSettings
                ? {
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
                } as ScreenFormInputConfig<'TextArea'>
                : null,
            */
            canEditOrgSettings
                ? {
                    name: 'createRequestChats',
                    type: 'Switch',
                    val: () => true,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: true,
                    props: {
                        label: 'Create channels for Requests'
                    }
                } as InlineFormInputConfig<'Switch'>
                :  null,
            /*
            canEditOrgSettings
                ? {
                    name: 'createShiftChats',
                    type: 'Switch',
                    val: () => false,
                    isValid: () => true,
                    onChange: (val) => {},
                    disabled: false,
                    props: {
                        label: 'Create chats for Shifts'
                    }
                } as InlineFormInputConfig<'Switch'>
                : null
            */
        ].filter(v => !!v)

        return inputs;
    }

    const homeScreen = (params: CustomFormHomeScreenProps) => {
        const inputs = params.inputs();

        const personalSettings = inputs[0];
        const orgSettings = inputs[1];

        const shouldShowOrgSettings = orgSettings && !!(orgSettings as StandAloneFormInputConfig[]).length

        return (
            <VisualArea>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <Pressable onPress={params.onContainerPress} style={{ flex: 1 }}>
                        <View style={styles.headerContainer}>
                            <IconButton
                                icon={'account'} 
                                color='#666'
                                size={20} 
                                style={styles.headerIcon} />
                            <Text style={styles.headerText}>{'PERSONAL'}</Text>
                        </View>
                        <View style={{ borderTopColor: '#ccc', borderTopWidth: 1 }}>
                            { params.renderInputs([personalSettings])}
                        </View>
                        { shouldShowOrgSettings
                            ? <>
                                <View style={styles.headerContainer}>
                                    <IconButton
                                        icon={'domain'} 
                                        color='#666'
                                        size={20} 
                                        style={styles.headerIcon} />
                                    <Text style={styles.headerText}>{'ORGANIZATION'}</Text>
                                </View>
                                <View style={{ borderTopColor: '#ccc', borderTopWidth: 1 }}>
                                    { params.renderInputs([orgSettings])}
                                </View>
                            </>
                            : null
                        }
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
}

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