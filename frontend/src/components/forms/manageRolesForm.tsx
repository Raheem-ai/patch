import { observer } from "mobx-react"
import React from "react"
import { Pressable, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "react-native-paper"
import { DefaultRoleIds } from "../../../../common/models"
import { resolveErrorMessage } from "../../errors"
import { alertStore, organizationStore, upsertRoleStore, userStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import DescriptiveNavigationLabel from "./inputs/descriptiveNavigationLabel"
import { NavigationFormInputConfig, SectionNavigationScreenViewProps } from "./types"
import UpsertRoleForm from "./upsertRoleForm"
import { VisualArea } from '../helpers/visualArea';

const MangeRolesForm = ({ back }: SectionNavigationScreenViewProps) => {

    const roleInputs = () => {
        const editRoleInputs = organizationStore().metadata.roleDefinitions.map(def => {
            return {
                name: def.id,
                label: ({ expand }) => {
                    const editRole = () => {
                        upsertRoleStore().loadRole(def)
                        expand()
                    }

                    return <DescriptiveNavigationLabel 
                                expand={editRole} 
                                name={def.name} 
                                inlineDescription={true}
                                description={def.id == DefaultRoleIds.Anyone ? ' (assigned to all members)' : null} />
                },
                screen: ({ back }) => {
                    const cancelEdit = () => {
                        upsertRoleStore().clear()
                        back()
                    }

                    const saveEdit = async () => {
                        try {
                            await upsertRoleStore().save()
                            back()
                        } catch (e) {
                            const errMessage = resolveErrorMessage(e)
                            alertStore().toastError(errMessage, true)
                        }
                    }

                    return <UpsertRoleForm headerLabel={def.name} cancel={cancelEdit} save={saveEdit}/>
                }
            } as NavigationFormInputConfig
        })

        const addRoleInput = {
            name: 'addRole',
            expandIcon: 'plus',
            labelContainerStyle: {
                borderBottomWidth: 0
            },
            label: ({ expand }) => {
                return (
                    <Pressable style={{ paddingVertical: 12}} onPress={expand}>
                        <Text style={{ color: '#666', fontSize: 16 }}>{'ADD ROLE'}</Text>
                    </Pressable>
                )
            },
            screen: ({ back }) => {
                const cancelAdd = () => {
                    upsertRoleStore().clear()
                    back()
                }

                const save = async () => {
                    try {
                        await upsertRoleStore().save()
                        back()
                    } catch (e) {
                        const errMessage = resolveErrorMessage(e)
                        alertStore().toastError(errMessage, true)
                    }
                }

                return <UpsertRoleForm headerLabel={'Add role'} cancel={cancelAdd} save={save}/>
            }
        } as NavigationFormInputConfig

        return [...editRoleInputs, addRoleInput]
    }

    const homeScreen = observer(({
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {

        const headerProps: BackButtonHeaderProps = {
            save: {
                handler: back,
                outline: true
            },
            label: 'Roles + permissions',
            bottomBorder: true
        }

        return (
            <>
                <BackButtonHeader {...headerProps}/>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ borderColor: '#ccc', borderBottomWidth: 1, paddingLeft: 60, padding: 20 }}>
                        <Text style={{ lineHeight: 24, fontSize: 16, color: '#666', marginBottom: 20 }}>{'Use Roles to specify who does what for a Shift or Request.'}</Text>
                        <Text style={{ lineHeight: 24, fontSize: 16, color: '#666' }}>{'Each role grants the permissions needed for that role. A person can be eligible for more than one role.'}</Text>
                    </View>
                    { renderInputs(inputs()) }
                </ScrollView>
                </>
        )
    })

    return (
        <VisualArea>
            <Form inputs={roleInputs} homeScreen={homeScreen}/>
        </VisualArea>
    )
}

export default MangeRolesForm;