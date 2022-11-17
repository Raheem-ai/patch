import { remove } from "lodash";
import { observer } from "mobx-react";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { CategorizedItem, DefaultRoleIds, PatchPermissions, Position, PositionStatus, ProtectedUser, RequestStatus } from "../../../common/models";
import { resolveErrorMessage } from "../errors";
import { alertStore, manageAttributesStore, organizationStore, requestStore, userStore } from "../stores/interfaces";
import { Colors, ICONS } from "../types";
import { iHaveAllPermissions } from "../utils";
import PositionCard from "./positionCard";
import UserIcon from "./userIcon";
import STRINGS from "../../../common/strings";
import PatchButton from "../components/patchButton";
import TestIds from "../test/ids";

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
    const request = requestStore().requests.get(requestId);
    const requestIsClosed = request.status == RequestStatus.Closed

    const positionMetadata = requestStore().getPositionScopedMetadata(userStore().user.id, requestId, pos.id);
    const joinedUsers = Array.from(positionMetadata.joinedUsers.values()).filter(userId => {
        const user = userStore().users.get(userId);
        return user && userStore().userInOrg(user)
    });

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

    type AttributeIsDesired = {
        name: string,
        isDesired: boolean
    }

    const userDetails: {
        name: string,
        attributes: AttributeIsDesired[],
        userId: string
    }[] = joinedUsers.map(userId => {
        const user = userStore().users.get(userId);

        if (!user || !userStore().userInOrg(user)) {
            return null;
        }

        const name = user.name;

        const isDesiredAttribute = (attr: CategorizedItem) => {
            return pos.attributes.some(el => el.itemId === attr.itemId);
        }

        const attributes = user.organizations[userStore().currentOrgId].attributes.map(attr => {
            return {
                name: manageAttributesStore().getAttribute(attr.categoryId, attr.itemId)?.name,
                isDesired: isDesiredAttribute(attr)
            }
        })
        .filter(x => !!x.name)
        .sort((a, b) => a.isDesired && !b.isDesired ? -1 : b.isDesired && !a.isDesired ? 1 : 0)
        
        return {
            name,
            userId, 
            attributes: attributes,
        }

    }).filter(x => !!x); 

    const actions = () => {
        if (requestIsClosed) {
            return null
        }

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
            return <PatchButton 
                testID={TestIds.positionDetailsCard.leave}
                mode='contained'
                label={STRINGS.REQUESTS.POSITIONS.leave}
                small={true}
                onPress={leave} />
        }

        if (positionMetadata.canJoin) {
            return <PatchButton 
                testID={TestIds.positionDetailsCard.join}
                mode='contained'
                label={STRINGS.REQUESTS.POSITIONS.join}
                small={true}
                onPress={join} />
        } else if (positionMetadata.canRequestToJoin) {
            return <PatchButton
                testID={TestIds.positionDetailsCard.requestToJoin}
                mode='outlined'
                label={STRINGS.REQUESTS.POSITIONS.request}
                small={true}
                onPress={requestToJoin} />
        } else {
            return null
        }
    }

    const userIsRequestAdmin = iHaveAllPermissions([PatchPermissions.RequestAdmin]);

    const removeUser = async (userId) => {
        try {
            await requestStore().removeUserFromRequest(userId, requestId, pos.id)
        } catch (e) {
            alertStore().toastError(resolveErrorMessage(e))
        }
    }

    const promptToRemoveUser = (userId) => {
        alertStore().showPrompt({
            title:  STRINGS.REQUESTS.POSITIONS.removeFromPositionDialogTitle(userStore().user.name),
            message: STRINGS.REQUESTS.POSITIONS.removeFromPositionDialogText(userStore().user.name),
            actions: [
                {
                    label: STRINGS.REQUESTS.POSITIONS.removeFromPositionDialogOptionNo,
                    onPress: () => {},
                },
                {   
                    label: STRINGS.REQUESTS.POSITIONS.removeFromPositionDialogOptionYes,
                    onPress: () => removeUser(userId),
                    confirming: true
                }
            ]
        })
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
                ? <View style={{ borderTopColor: Colors.borders.list, borderTopWidth: 1, marginBottom: 20 }}>
                    {
                        userDetails.map(details => {
                            return (
                                <View key={details.userId} style={{ marginTop: 20, flexDirection: 'row', width: '100%'}}>
                                    <UserIcon userId={details.userId} style={{marginTop: 2, flexGrow: 0}}/>
                                    <View style={{ marginLeft: 6, flexDirection: 'column', flexShrink: 1 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{details.name}</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                            {
                                                details.attributes.map((attr, i) => {
                                                    const addDelim = i < details.attributes.length - 1;
                                                    return addDelim 
                                                        ? <>
                                                            <Text key={attr.name} style={attr.isDesired ? styles.desiredAttribute : styles.attribute }>{attr.name}</Text>
                                                            <Text style={styles.visualDelim}>{STRINGS.visualDelim}</Text>
                                                        </>
                                                        : <Text key={attr.name} style={attr.isDesired ? styles.desiredAttribute : styles.attribute }>{attr.name}</Text>                                                        
                                                })
                                            }
                                        </View>
                                    </View>
                                    { userIsRequestAdmin
                                        ? <View style={styles.removeUser}>
                                            <IconButton
                                                icon={ICONS.deleteItem} 
                                                color={Colors.icons.light}
                                                size={20} 
                                                onPress={() => promptToRemoveUser(details.userId)}
                                                style={{ margin: 0, padding: 0, width: 20, height: 20 }} />
                                        </View>
                                        : null
                                    }
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
        letterSpacing: 0.8,
        borderRadius: 32
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: Colors.primary.alpha,
    },
    removeUser: {
        flexGrow: 1,
        alignItems: 'flex-end',
        marginRight: 16
    },
    attribute: {
        color: Colors.text.tertiary, 
        marginRight: 4,
        marginTop: 2,
        flexWrap: 'wrap' 
    },
    desiredAttribute: {
        color: Colors.text.secondary,
        marginRight: 4,
        marginTop: 2 
    },
    visualDelim: {
        color: Colors.text.tertiary,
        alignSelf: 'center',
        marginRight: 4,
    }
})    