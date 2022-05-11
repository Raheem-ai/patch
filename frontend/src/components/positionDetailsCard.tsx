import { observer } from "mobx-react";
import React from "react";
import { Pressable, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { PatchPermissions, Position, PositionStatus, ProtectedUser } from "../../../common/models";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import { iHaveAllPermissions } from "../utils";
import CategoryRow from "./forms/common/categoryRow";
import PositionCard from "./positionCard";
import UserIcon from "./userIcon";

type PositionDetailsCardProps = { 
    pos: Position,
    edit?: {
        permissions: PatchPermissions[],
        handler: () => void
    }
}

const PositionDetailsCard = observer(({ 
    pos,
    edit
}: PositionDetailsCardProps) => {

    const status = pos.joinedUsers.length
        ? pos.joinedUsers.length >= pos.min
            ? PositionStatus.MinSatisfied
            : PositionStatus.MinUnSatisfied
        : pos.min 
            // no users joined but there is a min set
            ? PositionStatus.Empty
            : PositionStatus.MinSatisfied;

    const userDetails: {
        name: string,
        attributes: string[],
        userId: string
    }[] = pos.joinedUsers.map(userId => {
        const user = userStore().users.get(userId);

        if (!user) {
            return null;
        }

        const name = user.name;
        // TODO: get from `user.attributes`
        const attributes = Array.from(manageAttributesStore().editStore.categories.entries()).map(([_, category]) => category.items[0]?.name) 
        
        return {
            name,
            userId, 
            attributes
        }

    }).filter(x => !!x); 

    return (
        <View>
            <PositionCard pos={pos} edit={edit} />
            <View>
                {
                    userDetails.map(details => {
                        return (
                            <View>
                                <Text>{details.name}</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    {
                                        details.attributes.map(attr => <Text>{attr}</Text>)
                                    }
                                </View>
                            </View>
                        )
                    })
                }
            </View>
        </View>
    )

})

export default PositionDetailsCard;