import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { DefaultRoleIds, PatchPermissions, Position, PositionStatus, ProtectedUser } from "../../../common/models";
import { resolveErrorMessage } from "../errors";
import { alertStore, manageAttributesStore, organizationStore, requestStore, userStore } from "../stores/interfaces";
import { Colors } from "../types";
import { iHaveAllPermissions } from "../utils";
import CategoryRow from "./forms/common/categoryRow";
import PositionCard from "./positionCard";
import UserIcon from "./userIcon";

type PositionDetailsCardProps = { 
    requestId: string,
    pos: Position,
    edit?: {
        permissions: PatchPermissions[],
        handler: () => void
    }
}

// Note: this is tied to requests right now vs being a general position details card
const PositionDetailsCard = observer(({ 
    requestId,
    pos,
    edit
}: PositionDetailsCardProps) => {

    const positionMetadata = requestStore().getPositionScopedMetadata(userStore().user.id, requestId, pos.id);
    const joinedUsers = Array.from(positionMetadata.joinedUsers.values());

    const status = joinedUsers.length
        ? joinedUsers.length >= pos.min
            ? PositionStatus.MinSatisfied
            : PositionStatus.MinUnSatisfied
        : pos.min 
            // no users joined but there is a min set
            ? PositionStatus.Empty
            : PositionStatus.MinSatisfied;

    const statusColor = status == PositionStatus.Empty
        ? Colors.bad
        : status == PositionStatus.MinUnSatisfied
            ? Colors.okay
            : status == PositionStatus.MinSatisfied
                ? Colors.good
                : Colors.bad;

    const userDetails: {
        name: string,
        attributes: string[],
        userId: string
    }[] = joinedUsers.map(userId => {
        const user = userStore().users.get(userId);

        if (!user) {
            return null;
        }

        const name = user.name;

        const attributeNames = user.organizations[userStore().currentOrgId].attributes.map(attr => {
            return manageAttributesStore().getAttribute(attr.categoryId, attr.itemId)?.name
        }).filter(x => !!x)
        
        return {
            name,
            userId, 
            attributes: attributeNames
        }

    }).filter(x => !!x); 

    const actions = () => {
        const join = async () => {
            try {
                await requestStore().joinRequest(requestId, pos.id)
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
            }
        }

        const leave = async () => {
            try {
                await requestStore().leaveRequest(requestId, pos.id)
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
            }
        }

        const requestToJoin = async () => {
            try {
                await requestStore().requestToJoinRequest(requestId, pos.id)
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
            }
        }

        if (positionMetadata.canLeave) {
            return <Button 
                style={[styles.button]}
                color={Colors.primary.alpha}
                mode='contained'
                onPress={leave}>{'Leave'}</Button>
        }

        if (positionMetadata.canJoin) {
            return <Button 
                style={[styles.button]}
                color={Colors.primary.alpha}
                mode='contained'
                onPress={join}>{'Join'}</Button>
        } else if (positionMetadata.canRequestToJoin) {
            return <Button 
                style={[styles.button, styles.outlineButton]}
                color={Colors.primary.alpha}
                mode='outlined'
                onPress={requestToJoin}>{'Request'}</Button>
        } else {
            return null
        }
    }

    const outerStatusSize = 20;
    const innerStatusSize = 8;
    const outterStatusOffset = (60 - outerStatusSize)/2;
    const innerStatusOffset = (outerStatusSize-innerStatusSize)/2;

    return (
        <View style={{ paddingLeft: 60, position: 'relative',  borderBottomColor: Colors.borders.formFields, borderBottomWidth: 1 }}>
            <View style={{ width: outerStatusSize, height: outerStatusSize, backgroundColor: statusColor, position: 'absolute', left: outterStatusOffset, top: outterStatusOffset, borderRadius: outerStatusSize }}>
                <View style={{ width: innerStatusSize, height: innerStatusSize, backgroundColor: '#fff', position: 'relative', left: innerStatusOffset, top: innerStatusOffset, borderRadius: innerStatusSize }}>
                </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                    <PositionCard 
                        onlyMissingUsers 
                        containerStyle={{ borderBottomWidth: 0 }} 
                        pos={pos} 
                        edit={edit} />
                </View>
                <View style={{ marginTop: 20, marginRight: 20 }}>{ actions() }</View>
            </View>
            { userDetails.length 
                ? <View style={{ borderTopColor: Colors.borders.formFields, borderTopWidth: 1, marginBottom: 20,}}>
                    {
                        userDetails.map(details => {
                            return (
                                <View key={details.userId} style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
                                    <UserIcon user={{ name: details.name }}/>
                                    <View style={{ marginLeft: 6 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{details.name}</Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            {
                                                details.attributes.map(attr => <Text key={attr} style={{ color: Colors.text.tertiary, marginRight: 6 }}>{attr}</Text>)
                                            }
                                        </View>
                                    </View>
                                </View>
                            )
                        })
                    }
                </View>
                : null
            }
        </View>
    )

})

export default PositionDetailsCard;

const styles = StyleSheet.create({
    button: {
        borderRadius: 32
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
    }
})    