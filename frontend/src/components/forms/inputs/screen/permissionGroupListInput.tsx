import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { IconButton, Text } from "react-native-paper";
import { PatchPermissionGroups, PermissionGroupMetadata } from "../../../../../../common/models";
import { resolvePermissionGroups } from '../../../../../../common/utils/permissionUtils'
import TestIds from "../../../../test/ids";
import { ICONS } from "../../../../types";
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
        icon: ICONS.organization,
        groups: [
            PatchPermissionGroups.ManageOrg,
        ]
    },
    {
        icon: ICONS.accountMultiple,
        groups: [
            PatchPermissionGroups.ManageTeam,
            PatchPermissionGroups.EditRoles
        ]
    },
    /*
    {
        icon: ICONS.schedule,
        groups: [
            PatchPermissionGroups.ManageSchedule,
        ]
    },
    */
    {
        icon: ICONS.request,
        groups: [
            PatchPermissionGroups.ManageRequests,
            PatchPermissionGroups.ContributeToRequests,
            PatchPermissionGroups.CloseRequests
        ]
    },
    {
        icon: ICONS.tag,
        groups: [
            PatchPermissionGroups.ManageMetadata,
            PatchPermissionGroups.ExportData
        ]
    },
    {
        icon: ICONS.channels,
        groups: [
            // TODO: add back when we have custom chats
            // PatchPermissionGroups.ManageChats,
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
        const wrappedTestID = TestIds.inputs.permissionGroupList.wrapper(this.props.config.testID)

        const headerProps: BackButtonHeaderProps = {
            testID: wrappedTestID,
            cancel: {
                handler: () => {
                    this.props.config.onCancel?.()
                    this.props.back()
                }
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
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1}}> 
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
                                                    ? '#000'
                                                    : '#ccc';


                                            return (
                                                <Pressable 
                                                    testID={TestIds.inputs.permissionGroupList.groupN(wrappedTestID, j)}
                                                    sentry-label={TestIds.inputs.permissionGroupList.groupN(wrappedTestID, j)}
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
                                                            icon={ICONS.selectListItem} 
                                                            color={checkColor}
                                                            size={styles.selectedIconContainer.height} 
                                                            style={{ margin: 0, padding: 0, width: styles.selectedIconContainer.height, height: styles.selectedIconContainer.height, alignSelf: 'flex-start'  }}
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
                                                                    top: 20, 
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
        position: 'relative',
        paddingLeft: 60 
    },
    selectedIconContainer: {
        marginRight: 20, 
        marginLeft: 10, 
        alignSelf: 'flex-start',
        marginTop: 18, 
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

    