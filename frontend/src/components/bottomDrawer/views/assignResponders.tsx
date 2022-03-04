import { observer } from "mobx-react"
import React from "react"
import { Dimensions, Pressable, StyleSheet, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text, Switch } from "react-native-paper"
import { HelpRequest } from "../../../../../common/models"
import { resolveErrorMessage } from "../../../errors"
import { alertStore, bottomDrawerStore, dispatchStore, IAlertStore, IBottomDrawerStore, IDispatchStore, IRequestStore, IUserStore, requestStore, userStore } from "../../../stores/interfaces"
import { Colors } from "../../../types"
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea"
import ResponderRow from "../../responderRow"
import SkillTag from "../../skillTag"

const dimensions = Dimensions.get('screen');

@observer
export default class AssignResponders extends React.Component {
    static raisedHeader = true;

    static submit = {
        isValid: () => {
            return !!dispatchStore().selectedResponderIds.size
        },
        action: async () => {
            const id = requestStore().currentRequest.id;

            try {
                await dispatchStore().assignRequest(id, Array.from(dispatchStore().selectedResponderIds.values()))
            } catch(e) {
                alertStore().toastError(resolveErrorMessage(e))
                return
            }

            alertStore().toastSuccess(`Notified ${dispatchStore().selectedResponderIds.size} responders`)

            bottomDrawerStore().hide()
        },
        label: () => {
            const count = dispatchStore().selectedResponderIds.size;
            
            return `Notify ${count || 'selected'} responders`
        }
    }

    static onHide = () => {
        dispatchStore().clear()
    }

    toggleSelectAll = () => {
        dispatchStore().toggleSelectAll();
    }

    toggleResponder = (userId) => {
        dispatchStore().toggleResponder(userId)
    }
    header = () => {
        const displayIdParts = requestStore().currentRequest.displayId.split('-');

        return (
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>
                        <Text style={styles.importantText}>Responders for {displayIdParts[0]}</Text>
                        <Text>-{displayIdParts[1]}</Text>
                    </Text>
                </View>
                <View>
                    <Text style={styles.headerSubTitle}>
                        <Text style={styles.importantText}>Need {requestStore().currentRequest.respondersNeeded} people</Text>
                        <Text> with these skills:</Text>
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap'}}>
                        { 
                            requestStore().currentRequest.skills.map((s) => {
                                const fulfilled = dispatchStore().selectedResponders.some(r => r.skills.includes(s));

                                return (
                                    <SkillTag style={{marginTop: 12, marginRight: 6}} skill={s} large type={fulfilled ? 'fulfilled': 'needed'} />
                                )
                            })
                        }
                </View>
            </View>
        )
    }

    responderActions = () => {
        const selectAllText = dispatchStore().selectAll ? 'unselect all' : 'select all';
        return (
            <View style={styles.responderActions}>
                <View style={styles.selectAllRow}>
                    <Text style={styles.responderCountText}>{`${dispatchStore().assignableResponders.length} responders`}</Text>
                    <Pressable style={styles.selectAllContainer} onPress={this.toggleSelectAll}>
                        <IconButton
                            style={styles.selectAllIcon}
                            icon={dispatchStore().selectAll ? 'check-circle' : 'check-circle-outline'}
                            color={dispatchStore().selectAll ? styles.selectedSelectAllIcon.color : styles.selectAllIcon.color}
                            size={styles.selectAllIcon.width} />
                        <Text style={styles.selectAllText}>{selectAllText}</Text>
                    </Pressable>
                </View>
                <View style={styles.includeOffDutyRow}>
                    <Text style={styles.includeOffDutyText}>{`Include off-duty`}</Text>
                        <Switch
                            value={dispatchStore().includeOffDuty} 
                            onValueChange={() => dispatchStore().toggleIncludeOffDuty()} 
                            color='#32D74B'/>
                </View>
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
            <BottomDrawerViewVisualArea >
                { this.header() }
                { this.responderActions() }
                { this.responders() }
            </BottomDrawerViewVisualArea>
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
        color: '#838383',
        width: 20,
        height: 20,
    },
    selectedSelectAllIcon: {
        color: Colors.primary.alpha,
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#666'
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
        borderColor: '#E0DEE0',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12
    },
    selectResponderIcon: {
        color: '#E0DEE0',
        width: 20,
        margin: 0,
    },
    chosenSelectResponderIcon: {
        backgroundColor: Colors.primary.alpha,
        color: '#fff',
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
    }
})