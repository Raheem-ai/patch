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
import { ScreenProps, Colors } from "../types";
import { alertStore, manageAttributesStore, manageTagsStore, organizationSettingsStore, organizationStore } from "../stores/interfaces";
import { iHaveAllPermissions } from "../utils";
import EditCategorizedItemForm from "../components/forms/editCategorizedItemForm";
import { RequestPrefixCharMax } from '../../../common/constants'
import { resolveErrorMessage } from "../errors";

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

        const canEditOrgSettings = iHaveAllPermissions([PatchPermissions.EditOrgSettings])

        const inputs = [
            canEditOrgSettings
                ? {
                    name: 'orgName',
                    type: 'TextArea',
                    val: () => organizationStore().metadata.name,
                    isValid: () => true,
                    // todo: onCancel
                    onCancel: async () => {
                        // organizationSettingsStore().clear()
                    },
                    onSave: async (val) => { 
                        try {
                            await organizationSettingsStore().saveName(val) 
                            organizationSettingsStore().clear()
                        } catch(e) {
                            alertStore().toastError({message: resolveErrorMessage(e)})
                            return
                        }
                    },
                    previewLabel: () => organizationStore().metadata.name,
                    placeholderLabel: () => 'Organization name',
                    headerLabel: () => 'Organization name',
                    props: {

                    }
                } as ScreenFormInputConfig<'TextArea'>
                : null,
            canEditOrgSettings
                ? {
                    name: 'requestPrefix',
                    type: 'TextArea',
                    val: () => organizationStore().metadata.requestPrefix,
                    isValid: () => true,
                    onCancel: async () => {
                        // organizationSettingsStore().clear()
                    },
                    onSave: async (val) => { 
                        try {
                            await organizationSettingsStore().saveRequestPrefix(val) 
                            organizationSettingsStore().clear()
                        } catch(e) {
                            alertStore().toastError({message: resolveErrorMessage(e)})
                            return
                        }
                    },
                    previewLabel: () => organizationStore().metadata.requestPrefix,
                    placeholderLabel: () => 'Request prefix',
                    headerLabel: () => 'Request prefix',
                    props: {
                        maxChar: RequestPrefixCharMax
                    }
                } as ScreenFormInputConfig<'TextArea'>
                : null,
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
                        label: 'Create channels for Shifts'
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
                <ScrollView showsVerticalScrollIndicator={false} style={[{ flex: 1 }, styles.pageContainer]}>
                    <Pressable onPress={params.onContainerPress} style={{ flex: 1 }}>
                        {/* <View style={styles.headerContainer}>
                            <IconButton
                                icon={'account'} 
                                color={Colors.icons.dark}
                                size={20} 
                                style={styles.headerIcon} />
                            <Text style={styles.headerText}>{'Personal'}</Text>
                        </View>
                        <View style={{ borderTopColor: Colors.borders.formFields, borderTopWidth: 1 }}>
                            { params.renderInputs([personalSettings])}
                        </View> */}
                        { shouldShowOrgSettings
                            ? <>
                                <View style={styles.headerContainer}>
                                    <IconButton
                                        icon={'domain'} 
                                        color={Colors.icons.dark}
                                        size={20} 
                                        style={styles.headerIcon} />
                                    <Text style={styles.headerText}>{'Organization'}</Text>
                                </View>
                                <View style={{ borderTopColor: Colors.borders.formFields, borderTopWidth: 1 }}>
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
    pageContainer: {
        backgroundColor: Colors.backgrounds.settings,
        height: '100%'
    },
    headerContainer: {
        marginTop: 40, 
        marginBottom: 20, 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    headerText: { 
        color: Colors.text.forms.sectionHeader, 
        fontSize: 16,
        textTransform: 'uppercase'
    },
    headerIcon: { 
        margin: 0, 
        padding: 0, 
        width: 20, 
        marginHorizontal: 20 
    }
})