import { observable, runInAction } from "mobx"
import { observer } from "mobx-react"
import React from "react"
import { Dimensions, Pressable, StyleSheet, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text, Switch } from "react-native-paper"
import { EligibilityOption, HelpRequest, StatusOption } from "../../../../../common/models"
import STRINGS from "../../../../../common/strings"
import { resolveErrorMessage } from "../../../errors"
import { alertStore, bottomDrawerStore, dispatchStore, IAlertStore, IBottomDrawerStore, IDispatchStore, IRequestStore, IUserStore, requestStore, userStore } from "../../../stores/interfaces"
import { Colors } from "../../../types"
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader"
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea"
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../../listHeader"
import ResponderRow from "../../responderRow"

const dimensions = Dimensions.get('screen');

@observer
export default class AssignResponders extends React.Component {

    header = () => {
        const headerConfig: BackButtonHeaderProps = {
            cancel: {
                handler: async () => {
                    dispatchStore().clear()
                },
            },
            save: {
                handler: async () => {
                    const id = requestStore().currentRequest.id;

                    try {
                        bottomDrawerStore().startSubmitting()
                        await dispatchStore().assignRequest(id, Array.from(dispatchStore().selectedResponderIds.values()))
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    alertStore().toastSuccess(STRINGS.REQUESTS.NOTIFICATIONS.nRespondersNotified(dispatchStore().selectedResponderIds.size))

                    bottomDrawerStore().hide()
                },
                label: () => {
                    const count = dispatchStore().selectedResponderIds.size;
                    
                    return `Notify ${count || 'selected'} responder` + (count == 1 ? '':'s')
                },
                validator: () => {
                    return !!dispatchStore().selectedResponderIds.size
                }
            },
            bottomDrawerView: true,
        }

        return <BackButtonHeader {...headerConfig}/>
    }

    toggleSelectAll = () => {
        dispatchStore().toggleSelectAll();
    }

    toggleResponder = (userId) => {
        dispatchStore().toggleResponder(userId)
    }
    
    listHeader = () => {

        const headerProps: ListHeaderProps = {
            openHeaderLabel: 'People to notify',
    
            optionConfigs: [
                {
                    chosenOption: dispatchStore().roleOption,
                    options: dispatchStore().roleOptions,
                    toHeaderLabel: dispatchStore().roleOptionToHeaderLabel,
                    toOptionLabel: dispatchStore().roleOptionToOptionLabel,
                    onUpdate: dispatchStore().setRoleOption
                },
                {
                    chosenOption: dispatchStore().statusOption,
                    options: dispatchStore().statusOptions,
                    toHeaderLabel: dispatchStore().statusOptionToHeaderLabel,
                    toOptionLabel: dispatchStore().statusOptionToOptionLabel,
                    onUpdate: dispatchStore().setStatusOption
                },
                {
                    chosenOption: dispatchStore().eligibilityOption,
                    options: dispatchStore().eligibilityOptions,
                    toHeaderLabel: dispatchStore().eligibilityOptionToHeaderLabel,
                    toOptionLabel: dispatchStore().eligibilityOptionToOptionLabel,
                    onUpdate: dispatchStore().setEligibilityOption
                }
            ] as [
                ListHeaderOptionConfig<string>, 
                ListHeaderOptionConfig<StatusOption>,
                ListHeaderOptionConfig<EligibilityOption>,
            ]
        }

        return <ListHeader {...headerProps}/>
    }

    responderActions = () => {
        const selectAllText = dispatchStore().selectAll ? STRINGS.REQUESTS.NOTIFICATIONS.unselectAll : STRINGS.REQUESTS.NOTIFICATIONS.selectAll;
        return (
            <View style={styles.responderActions}>
                <View style={styles.selectAllRow}>
                    <Text style={styles.responderCountText}>{dispatchStore().assignableResponders.length} {STRINGS.responders(dispatchStore().assignableResponders.length)}</Text>
                    <Pressable style={styles.selectAllContainer} onPress={this.toggleSelectAll}>
                        <IconButton
                            style={styles.selectAllIcon}
                            icon={dispatchStore().selectAll ? 'check-circle' : 'check-circle-outline'}
                            color={dispatchStore().selectAll ? styles.selectedSelectAllIcon.color : styles.selectAllIcon.color}
                            size={styles.selectAllIcon.width} />
                        <Text style={styles.selectAllText}>{selectAllText}</Text>
                    </Pressable>
                </View>
                {/* <View style={styles.includeOffDutyRow}>
                    <Text style={styles.includeOffDutyText}>{`Include off-duty`}</Text>
                        <Switch
                            value={dispatchStore().includeOffDuty} 
                            onValueChange={() => dispatchStore().toggleIncludeOffDuty()} 
                            color='#32D74B'/>
                </View> */}
            </View>
        )
    }

    responders = () => {

        return (
            <ScrollView style={{ flex: 1 }}>
                { 
                    dispatchStore().assignableResponders.map((r) => {
                        const maxWidth = dimensions.width - (styles.responderRow.paddingHorizontal * 2) - styles.selectResponderIconContainer.width - styles.selectResponderIconContainer.marginLeft;
                        const isSelected = dispatchStore().selectedResponderIds.has(r.id);

                        const chooseResponder = () => this.toggleResponder(r.id)

                        return (
                            <Pressable key={r.id} style={styles.responderRow} onPress={chooseResponder}>
                                <ResponderRow 
                                    onPress={chooseResponder}
                                    style={[styles.responderRowOverride, { maxWidth }]} 
                                    responder={r} 
                                    orgId={userStore().currentOrgId} 
                                    request={requestStore().currentRequest}
                                    isSelected={isSelected}/>
                                <View style={[styles.selectResponderIconContainer, isSelected ? styles.chosenSelectResponderIcon : null ]}>
                                    <IconButton
                                        style={styles.selectResponderIcon}
                                        icon='check' 
                                        color={isSelected ? styles.chosenSelectResponderIcon.color : styles.selectResponderIcon.color}
                                        size={styles.selectResponderIcon.width} />
                                </View>
                            </Pressable>
                        )
                    })
                }
            </ScrollView>
        )
    }

    render() {
        return (
            <>
                { this.header() }
                { this.listHeader() }
                { this.responderActions() }
                { this.responders() }
            </>
        )
    }
}

const styles = StyleSheet.create({
    importantText: {
        fontWeight: 'bold'
    },
    header: {
        backgroundColor: '#F3F1F3',
        padding: 20,
        // paddingBottom: 8
    },
    headerTitle: {
        fontSize: 18,
        marginBottom: 16
    },
    headerSubTitle: {
        fontSize: 14
    }, 
    responderActions: {
        padding: 20,
        paddingTop: 12
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    responderCountText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666'
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    selectAllIcon: {
        color: Colors.icons.light,
        width: 20,
        height: 20,
    },
    selectedSelectAllIcon: {
        color: Colors.primary.alpha,
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '400',
        color: Colors.icons.dark
    },
    includeOffDutyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12
    },
    includeOffDutyText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#666'
    },
    responderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 20
    },
    responderRowOverride: {
        marginBottom: 0 
    },
    selectResponderIconContainer: {
        height: 32,
        width: 32,
        borderRadius: 32,
        borderColor: Colors.borders.formFields,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12
    },
    selectResponderIcon: {
        color: Colors.borders.formFields,
        width: 20,
        margin: 0,
    },
    chosenSelectResponderIcon: {
        backgroundColor: Colors.primary.alpha,
        color: Colors.text.defaultReversed,
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
    }
})
