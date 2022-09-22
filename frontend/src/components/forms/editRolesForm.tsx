import { observer } from "mobx-react"
import React from "react"
import { Pressable, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "react-native-paper"
import { DefaultRoleIds } from "../../../../common/models"
import { resolveErrorMessage } from "../../errors"
import { alertStore, organizationStore, upsertRoleStore } from "../../stores/interfaces"
import Form, { CustomFormHomeScreenProps } from "./form"
import BackButtonHeader, { BackButtonHeaderProps } from "./inputs/backButtonHeader"
import DescriptiveNavigationLabel from "./inputs/descriptiveNavigationLabel"
import { NavigationFormInputConfig, SectionNavigationScreenViewProps } from "./types"
import UpsertRoleForm from "./upsertRoleForm"
import { VisualArea } from '../helpers/visualArea'
import STRINGS from "../../../../common/strings"
import { Colors, ICONS } from "../../types"

const MangeRolesForm = ({ back }: SectionNavigationScreenViewProps) => {

    const roleInputs = () => {
        const editRoleInputs = organizationStore().metadata.roleDefinitions.map(def => {
            return {
                name: def.id,
                expandOverride: (expand) => {
                    upsertRoleStore().loadRole(def)
                    expand()
                },
                label: ({ expand }) => {
                    return <DescriptiveNavigationLabel 
                                expand={expand} 
                                name={def.name} 
                                inlineDescription={true}
                                description={def.id == DefaultRoleIds.Anyone ? STRINGS.SETTINGS.assignedToAll : null} />
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
                            alertStore().toastError(resolveErrorMessage(e))
                        }
                    }

                    return <UpsertRoleForm headerLabel={def.name} cancel={cancelEdit} save={saveEdit}/>
                }
            } as NavigationFormInputConfig
        })

        const addRoleInput = {
            name: 'addRole',
            expandIcon: ICONS.add,
            labelContainerStyle: {
                borderBottomWidth: 0
            },
            label: ({ expand }) => {
                return (
                    <Pressable style={{ paddingVertical: 12}} onPress={expand}>
                        <Text style={{  fontSize: 14, fontWeight: 'bold', color: Colors.primary.alpha, textTransform:'uppercase' }}>{STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.role())}</Text>
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
                        alertStore().toastError(resolveErrorMessage(e))
                    }
                }

                return <UpsertRoleForm headerLabel={STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.role())} cancel={cancelAdd} save={save}/>
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
            label: STRINGS.SETTINGS.rolesAndPermissions,
            bottomBorder: true
        }

        return (
            <>
                <BackButtonHeader {...headerProps}/>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={{ borderColor: '#ccc', borderBottomWidth: 1, paddingLeft: 60, padding: 20 }}>
                        <Text style={{ lineHeight: 24, fontSize: 16, color: '#666', marginBottom: 20 }}>{STRINGS.SETTINGS.rolesIntroA}</Text>
                        <Text style={{ lineHeight: 24, fontSize: 16, color: '#666' }}>{STRINGS.SETTINGS.rolesIntroB}</Text>
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