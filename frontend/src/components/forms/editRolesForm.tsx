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
import TestIds from "../../test/ids"
import SelectableText from "../helpers/selectableText"

type ManageRolesFormProps = SectionNavigationScreenViewProps & {
    testID: string
}

const MangeRolesForm = ({ back, testID }: ManageRolesFormProps) => {
    const wrappedTestID = TestIds.editRolesForm.wrapper(testID);

    const roleInputs = () => {
        const editRoleInputs = organizationStore().metadata.roleDefinitions.map((def, idx) => {
            return {
                name: def.id,
                expandOverride: (expand) => {
                    upsertRoleStore().loadRole(def)
                    expand()
                },
                label: ({ expand }) => {
                    return <DescriptiveNavigationLabel 
                                testID={TestIds.editRolesForm.navInputs.roleOptionN(wrappedTestID, idx)}
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

                    return <UpsertRoleForm testID={TestIds.editRolesForm.navInputs.roleOption(wrappedTestID)} headerLabel={def.name} cancel={cancelEdit} save={saveEdit}/>
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
                    <Pressable 
                        style={{ paddingVertical: 12}} 
                        onPress={expand}
                        testID={TestIds.editRolesForm.navInputs.addRole(wrappedTestID)}
                        sentry-label={TestIds.editRolesForm.navInputs.addRole(wrappedTestID)}
                    >
                        <SelectableText style={{  fontSize: 14, fontWeight: 'bold', color: Colors.primary.alpha, textTransform:'uppercase' }}>{STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.role())}</SelectableText>
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

                return (
                    <UpsertRoleForm 
                        testID={TestIds.editRolesForm.navInputs.addRole(wrappedTestID)} 
                        headerLabel={STRINGS.INTERFACE.addElement(STRINGS.ELEMENTS.role())} 
                        cancel={cancelAdd} 
                        save={save}/>
                )
            }
        } as NavigationFormInputConfig

        return [...editRoleInputs, addRoleInput]
    }

    const homeScreen = observer(({
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {

        const headerProps: BackButtonHeaderProps = {
            testID: wrappedTestID,
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
                        <SelectableText style={{ lineHeight: 24, fontSize: 16, color: '#666', marginBottom: 20 }}>{STRINGS.SETTINGS.rolesIntroA}</SelectableText>
                        <SelectableText style={{ lineHeight: 24, fontSize: 16, color: '#666' }}>{STRINGS.SETTINGS.rolesIntroB}</SelectableText>
                    </View>
                    { renderInputs(inputs()) }
                </ScrollView>
                </>
        )
    })

    return (
        <VisualArea>
            <Form 
                testID={wrappedTestID} 
                inputs={roleInputs} 
                homeScreen={homeScreen}
            />
        </VisualArea>
    )
}

export default MangeRolesForm;