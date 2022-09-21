import { observer } from "mobx-react";
import React from "react";
import { Pressable, View, ViewStyle } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { PatchPermissions, Position, PositionStatus, ProtectedUser } from "../../../common/models";
import { manageAttributesStore, organizationStore, userStore } from "../stores/interfaces";
import { iHaveAllPermissions } from "../utils";
import UserIcon from "./userIcon";
import { Colors, ICONS } from "../types";

type PositionCardProps = { 
    pos: Position,
    edit?: {
        permissions: PatchPermissions[],
        handler: () => void
    },
    containerStyle?: ViewStyle,
    onlyMissingUsers?: boolean
}

const PositionCard = observer(({ 
    pos,
    edit,
    containerStyle,
    onlyMissingUsers
}: PositionCardProps) => {
    const roleName = organizationStore().roles.get(pos.role).name
    
    const attrNames = pos.attributes.map(attr => {
        const category = manageAttributesStore().attributeCategories.get(attr.categoryId);
        return category.items.find(item => item.id == attr.itemId).name
    })

    const min = onlyMissingUsers
        ? pos.min - pos.joinedUsers.length
        : pos.min;

    const userIcons = [];
    
    for (let i = 0; i < min; i++) {
        let user: ClientSideFormat<ProtectedUser> = null;

        if (!onlyMissingUsers && pos.joinedUsers.length && pos.joinedUsers.length > i) {
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
        <Pressable onPress={edit?.handler} style={[{ flexDirection: 'row', paddingVertical: 20, borderBottomColor: Colors.borders.formFields, borderBottomWidth: 1 }, containerStyle]}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{roleName}</Text>
                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                    { 
                        attrNames.map(attr => {
                            return <Text key={attr} style={{ marginRight: 12, fontSize: 14, color: Colors.text.tertiary }}>{attr}</Text>
                        }) 
                    }
                </View>
                { userIcons.length > 0 
                    ? <View style={{ flexDirection: 'row', marginTop: 16 }}>{userIcons}</View>
                    : null }
            </View>
            { !!edit && hasPermissions
                ? <View style={{ alignItems: 'center', marginRight: 20, marginLeft: 20 }}>
                    <IconButton
                        icon={ICONS.edit} 
                        color={Colors.icons.light}
                        size={20} 
                        style={{ margin: 0, padding: 0, width: 20, height: 20 }} />
                </View>
                : null
            }
        </Pressable>
    )
})

export default PositionCard;