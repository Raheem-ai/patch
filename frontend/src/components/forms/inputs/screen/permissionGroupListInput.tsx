import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet, Pressable } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { IconButton, List, Text } from "react-native-paper";
import { PatchPermissionGroups, PermissionGroupMetadata } from "../../../../../../common/models";
import { resolvePermissionGroups } from '../../../../../../common/utils/permissionUtils'
import { SectionScreenViewProps } from "../../types";
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader";

/**
 * Note: for this to work visually, all groups that are forced must be directly under the group that forces them
 */
const PermissionGroupListConfig: {
    icon: string,
    groups: PatchPermissionGroups[]
}[] = [
    {
        icon: 'domain',
        groups: [
            PatchPermissionGroups.ManageOrg,
        ]
    },
    {
        icon: 'account-multiple',
        groups: [
            PatchPermissionGroups.ManageTeam,
            PatchPermissionGroups.EditRoles
        ]
    },
    {
        icon: 'calendar-blank',
        groups: [
            PatchPermissionGroups.ManageSchedule,
        ]
    },
    {
        icon: 'lightning-bolt',
        groups: [
            PatchPermissionGroups.ManageRequests,
            PatchPermissionGroups.ContributeToRequests,
            PatchPermissionGroups.CloseRequests
        ]
    },
    {
        icon: 'tag-heart',
        groups: [
            PatchPermissionGroups.ManageMetadata,
            PatchPermissionGroups.ExportData
        ]
    },
    {
        icon: 'message',
        groups: [
            PatchPermissionGroups.ManageChats,
            PatchPermissionGroups.InviteToChats,
            PatchPermissionGroups.SeeAllChats,
        ]
    }
]

@observer
export default class PermissionGroupListInput extends React.Component<SectionScreenViewProps<'PermissionGroupList'>> {
    private selectedGroups = observable(new Set(this.props.config.val()));
    
    private visuallySelectedGroups = computed(() => {
        return resolvePermissionGroups(Array.from(this.selectedGroups.values()))
    })

    private forcedGroups = computed(() => {
        const forcedSet = new Set<PatchPermissionGroups>()

        this.visuallySelectedGroups.get().forEach(group => {
            const metadata = PermissionGroupMetadata[group];

            if (metadata.forces && metadata.forces.length) {
                metadata.forces.forEach(forcedGroup => {
                    forcedSet.add(forcedGroup)
                })
            }
        })
        
        return forcedSet
    })

    toggleGroup = (group: PatchPermissionGroups) => {
        runInAction(() => {
            if (this.selectedGroups.has(group)) {
                this.selectedGroups.delete(group)
            } else if (!this.forcedGroups.get().has(group)) {
                this.selectedGroups.add(group)
            }
        })
    }

    save = () => {
        this.props.config.onSave(Array.from(this.selectedGroups.values()));
        this.props.back();
    }

    render(): React.ReactNode {
        const headerProps: BackButtonHeaderProps = {
            cancel: {
                handler: () => this.props.back()
            },
            save: {
                handler: this.save,
            },
            label: this.props.config.headerLabel,
            bottomBorder: true
        }

        const verticlePadding = 20 - ((styles.name.lineHeight - styles.name.fontSize) / 2)
    
        return (
            <>
                <BackButtonHeader  {...headerProps} />
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingLeft: 60 }}> 
                    {
                        PermissionGroupListConfig.map((config, i) => {
                            const isLast = (i == PermissionGroupListConfig.length - 1);

                            // need to know ahead of time the number of rows that will be forced if the main one is selected
                            const groupsToForce = PermissionGroupMetadata[config.groups[0]]?.forces?.length || 0
                            
                            return (
                                <View style={[{ position: 'relative' }, isLast ? null : { borderBottomColor: '#ccc', borderBottomWidth: 1 }]}>
                                    <View style={styles.iconContainer}>
                                        <IconButton
                                            icon={config.icon} 
                                            color='#666'
                                            size={20} 
                                            style={{ margin: 0, padding: 0, width: 20 }}
                                            />
                                    </View>
                                    {
                                        config.groups.map((group, j) => {
                                            const isSelected = this.selectedGroups.has(group);
                                            const isForced = this.forcedGroups.get().has(group);
                                            const metadata = PermissionGroupMetadata[group];
                                            const isForcing = isSelected && metadata.forces && !!metadata.forces.length;
                                            const isLastOfForced = j == groupsToForce;

                                            const checkColor = isSelected 
                                                ? '#000'
                                                : isForced
                                                    ? '#666'
                                                    : '#999';


                                            return (
                                                <Pressable 
                                                    style={styles.rowContainer} 
                                                    onPress={() => this.toggleGroup(group)}>

                                                    {/* make the top align with the icons */}
                                                    <View style={[{ flex: 1, marginVertical: verticlePadding }]}>
                                                        <Text style={[ styles.name, isSelected || isForced ? styles.selectedName : null ]}>
                                                            { metadata.name }
                                                        </Text>
                                                        <Text style={styles.description}>
                                                            { metadata.description }
                                                        </Text>
                                                    </View>
                                                    <View style={styles.selectedIconContainer}>
                                                        <IconButton
                                                            icon={'check'} 
                                                            color={checkColor}
                                                            size={styles.selectedIconContainer.height} 
                                                            style={{ margin: 0, padding: 0, width: styles.selectedIconContainer.height, height: styles.selectedIconContainer.height }}
                                                            />
                                                    </View>
                                                    { 
                                                        // react native has a bug rendering dashed/dotted borders on one side so here is a workaround
                                                        (isForcing || isForced) && !isLastOfForced 
                                                            ? <View style={{ 
                                                                    overflow: 'hidden',
                                                                    width: 1,
                                                                    height: '100%', 
                                                                    position: 'absolute', 
                                                                    top: '50%', 
                                                                    right: 30 }
                                                                }>
                                                                    <View style={{ borderColor: '#666', borderWidth: 1, borderStyle: 'dashed', height: '100%' }}></View>

                                                            </View>
                                                            : null
                                                    }
                                                </Pressable>
                                            )
                                        })
                                    }
                                </View>
                            )
                        })
                    }
                </ScrollView>
            </>
        )
    }

}

const styles = StyleSheet.create({
    rowContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        position: 'relative'
    },
    selectedIconContainer: {
        marginRight: 20, 
        marginLeft: 10, 
        alignSelf: 'center', 
        zIndex: 10, 
        backgroundColor: '#fff', 
        height: 20 
    },
    iconContainer: {
        height: 60,
        width: 60,
        position: 'absolute', 
        justifyContent: 'center',
        alignContent: 'center',
        alignSelf: 'flex-start',
        padding: 20,
        left: -60
    },
    rightCheckIcon: {
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        height: 20
    },
    name: {
        lineHeight: 24,
        fontSize: 16,
        color: '#666'
    },
    selectedName: {
        fontWeight: 'bold',
        color: '#000'
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginTop: 4

    }
})

    