import { observer } from "mobx-react";
import React from "react";
import { Pressable, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { PatchPermissions, Position, PositionStatus, ProtectedUser } from "../../../common/models";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import { iHaveAllPermissions } from "../utils";
import UserIcon from "./userIcon";

type PositionCardProps = { 
    pos: Position,
    edit?: {
        permissions: PatchPermissions[],
        handler: () => void
    }
}

const PositionCard = observer(({ 
    pos,
    edit
}: PositionCardProps) => {
    const roleName = organizationStore().roles.get(pos.role).name
    
    const attrNames = pos.attributes.map(attr => {
        const category = manageAttributesStore().editStore.categories.get(attr.categoryId);
        return category.items.find(item => item.id == attr.itemId).name
    })

    const min = pos.min;

    const userIcons = [];
    
    for (let i = 0; i < pos.min; i++) {
        let user: ClientSideFormat<ProtectedUser> = null;

        if (pos.joinedUsers.length && pos.joinedUsers.length > i) {
            const userId = pos.joinedUsers[i];
            user = userStore().users.get(userId);
        }

        if (user) {
            userIcons.push(<UserIcon user={{ name: user.name }}/>)
        } else {
            userIcons.push(<UserIcon/>)
        }
        
    }

    const hasPermissions = iHaveAllPermissions(edit?.permissions || []);

    return (
        <Pressable onPress={edit?.handler} style={{ flexDirection: 'row', paddingVertical: 20, borderBottomColor: '#E0E0E0', borderBottomWidth: 1 }}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{roleName}</Text>
                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                    { 
                        attrNames.map(attr => {
                            return <Text style={{ marginRight: 12, fontSize: 12, color: '#666666' }}>{attr}</Text>
                        }) 
                    }
                </View>
                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                    { userIcons }
                    {
                        pos.max == -1
                            ? <IconButton
                                icon={'plus'} 
                                color='#999999'
                                size={20} 
                                style={{ margin: 0, padding: 0, width: 20 }} />
                            : null
                    }
                </View>
            </View>
            { !!edit && hasPermissions
                ? <View style={{ alignItems: 'center', marginRight: 20, marginLeft: 20 }}>
                    <IconButton
                        icon={'pencil'} 
                        color='#999999'
                        size={20} 
                        style={{ margin: 0, padding: 0, width: 20, height: 20 }} />
                </View>
                : null
            }
        </Pressable>
    )
})

export default PositionCard;