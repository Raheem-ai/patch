import { observer } from "mobx-react"
import React from "react"
import { Dimensions, StyleSheet, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { IconButton, Text, Switch } from "react-native-paper"
import { HelpRequest } from "../../../common/models"
import { IBottomDrawerStore, IDispatchStore, IRequestStore, IUserStore } from "../stores/interfaces"
import { getStore } from "../stores/meta"
import { Colors } from "../types"
import ResponderRow from "./responderRow"
import SkillTag from "./skillTag"

const dimensions = Dimensions.get('screen');

@observer
export default class AssignResponders extends React.Component {
    userStore = getStore<IUserStore>(IUserStore);
    dispatchStore = getStore<IDispatchStore>(IDispatchStore);
    requestStore = getStore<IRequestStore>(IRequestStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    static raisedHeader = true;

    static submit = {
        action: async () => {
            const requestStore = getStore<IRequestStore>(IRequestStore);
            const dispatchStore = getStore<IDispatchStore>(IDispatchStore);
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const id = requestStore.currentRequest.id;

            await dispatchStore.assignRequest(id, Array.from(dispatchStore.selectedResponderIds.values()))

            bottomDrawerStore.hide();
        },
        label: () => {
            const dispatchStore = getStore<IDispatchStore>(IDispatchStore);
            const count = dispatchStore.selectedResponderIds.size;
            
            return `Notify ${count || 'selected'} responders`
        }
    }

    static onHide = () => {
        const dispatchStore = getStore<IDispatchStore>(IDispatchStore);
        dispatchStore.clear()
    }

    toggleSelectAll = () => {
        this.dispatchStore.toggleSelectAll();
    }

    toggleResponder = (userId) => {
        this.dispatchStore.toggleResponder(userId)
    }
    
    header = () => {
        const displayIdParts = this.requestStore.currentRequest.displayId.split('-');

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
                        <Text style={styles.importantText}>Need {this.requestStore.currentRequest.respondersNeeded} people</Text>
                        <Text> with these skills:</Text>
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap'}}>
                        { 
                            this.requestStore.currentRequest.skills.map((s) => {
                                const fulfilled = this.dispatchStore.selectedResponders.some(r => r.skills.includes(s));

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
        const selectAllText = this.dispatchStore.selectAll ? 'unselect all' : 'select all';
        return (
            <View style={styles.responderActions}>
                <View style={styles.selectAllRow}>
                    <Text style={styles.responderCountText}>{`${this.dispatchStore.assignableResponders.length} responders`}</Text>
                    <View style={styles.selectAllContainer} onTouchStart={this.toggleSelectAll}>
                        <IconButton
                            style={styles.selectAllIcon}
                            icon={this.dispatchStore.selectAll ? 'check-circle' : 'check-circle-outline'}
                            color={this.dispatchStore.selectAll ? styles.selectedSelectAllIcon.color : styles.selectAllIcon.color}
                            size={styles.selectAllIcon.width} />
                        <Text style={styles.selectAllText}>{selectAllText}</Text>
                    </View>
                </View>
                <View style={styles.includeOffDutyRow}>
                    <Text style={styles.includeOffDutyText}>{`Include off-duty`}</Text>
                        <Switch
                            value={this.dispatchStore.includeOffDuty} 
                            onValueChange={() => this.dispatchStore.toggleIncludeOffDuty()} 
                            color='#32D74B'/>
                </View>
            </View>
        )
    }

    responders = () => {

        return (
            <ScrollView style={{ flex: 1 }}>
                { 
                    this.dispatchStore.assignableResponders.map((r) => {
                        const maxWidth = dimensions.width - (styles.responderRow.paddingHorizontal * 2) - styles.selectResponderIconContainer.width - styles.selectResponderIconContainer.marginLeft;
                        const isSelected = this.dispatchStore.selectedResponderIds.has(r.id);

                        return (
                            <View key={r.id} style={styles.responderRow} onTouchStart={() => this.toggleResponder(r.id)}>
                                <ResponderRow 
                                    style={[styles.responderRowOverride, { maxWidth }]} 
                                    responder={r} 
                                    orgId={this.userStore.currentOrgId} 
                                    request={this.requestStore.currentRequest}
                                    isSelected={isSelected}/>
                                <View style={[styles.selectResponderIconContainer, isSelected ? styles.chosenSelectResponderIcon : null ]}>
                                    <IconButton
                                        style={styles.selectResponderIcon}
                                        icon='check' 
                                        color={isSelected ? styles.chosenSelectResponderIcon.color : styles.selectResponderIcon.color}
                                        size={styles.selectResponderIcon.width} />
                                </View>
                            </View>
                        )
                    })
                }
            </ScrollView>
        )
    }

    render() {
        return (
            <View style={{ height: this.bottomDrawerStore.drawerContentHeight }}>
                { this.header() }
                { this.responderActions() }
                { this.responders() }
            </View>
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