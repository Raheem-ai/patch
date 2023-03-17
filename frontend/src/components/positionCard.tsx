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
import TestIds from "../test/ids";

type PositionCardProps = { 
    testID: string,
    // getting position like this because it could be coming from a store that is getting updated 
    // or it could be from the position input label
    positionHandle: () => Position
    edit?: {
        permissions: PatchPermissions[],
        handler: () => void
    },
    containerStyle?: ViewStyle,
    onlyMissingUsers?: boolean
}

const PositionCard = observer(({
    testID,
    positionHandle,
    edit,
    containerStyle,
    onlyMissingUsers
}: PositionCardProps) => {
    const pos = positionHandle()
    const roleName = organizationStore().roles.get(pos.role).name
    
    const attrNames = pos.attributes.map(attr => {
        const category = manageAttributesStore().attributeCategories.get(attr.categoryId);

        if (!category) {
            return null
        }

        return category.items.find(item => item.id == attr.itemId)?.name
    }).filter(a => !!a)

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
            userIcons.push(<UserIcon userId={user.id}/>)
        } else {
            userIcons.push(<UserIcon/>)
        }
        
    }

    const hasPermissions = iHaveAllPermissions(edit?.permissions || []);
    const wrappedTestID = TestIds.positionCard.wrapper(testID);

    return (
        <Pressable testID={wrappedTestID} onPress={edit?.handler} style={[{ flexDirection: 'row', paddingVertical: 20, borderBottomColor: Colors.borders.formFields, borderBottomWidth: 1 }, containerStyle]}>
            <View style={{ flex: 1 }}>
                <Text testID={TestIds.positionCard.roleText(wrappedTestID)} style={{ fontSize: 16, fontWeight: 'bold' }}>{roleName}</Text>
                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                    { 
                        attrNames.map((attr, idx) => {
                            return <Text testID={TestIds.positionCard.attrText(wrappedTestID, idx)} key={attr} style={{ marginRight: 12, fontSize: 14, color: Colors.text.tertiary }}>{attr}</Text>
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