import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { GestureResponderEvent, Pressable, ScrollView, StyleSheet, View, Text } from "react-native";
import { ProtectedUser, TeamFilter, TeamSortBy } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import ResponderRow from "../components/responderRow";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { ITeamStore, IUserStore, teamStore, userStore } from "../stores/interfaces";
import { ScreenProps, routerNames, ICONS, Colors } from "../types";
import { IconButton } from "react-native-paper";
import { ClientSideFormat } from "../../../common/api";
import { navigateTo } from "../navigation";

type Props = ScreenProps<'TeamList'>;

const TeamFilterToLabelMap: { [key in TeamFilter] : string } = {
    [TeamFilter.Everyone]: 'Everyone',
    [TeamFilter.OnDuty]: 'Available',
    [TeamFilter.OffDuty]: 'Off-duty'
}

const TeamSortByToLabelMap: { [key in TeamSortBy] : string } = {
    [TeamSortBy.ByFirstName]: 'By first name',
    [TeamSortBy.ByLastName]: 'By last name',
}

const TeamList = observer(({ navigation, route }: Props) => {
    const allFilters = allEnumValues<TeamFilter>(TeamFilter);
    const allSortBys = allEnumValues<TeamSortBy>(TeamSortBy);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        teamStore().refreshUsers();
    }, [])

    const headerProps: ListHeaderProps = {
        openHeaderLabel: 'People to show',
        closedHeaderStyles: styles.closedFilterHeader,
        viewIsScrolled: isScrolled,

        optionConfigs: [
            {
                chosenOption: teamStore().filter,
                options: allFilters,
                toHeaderLabel: (filter: TeamFilter) => {
                    return filter == TeamFilter.Everyone 
                        ? TeamFilterToLabelMap[filter] 
                        : `${TeamFilterToLabelMap[filter]} people`;
                },
                toOptionLabel: (filter: TeamFilter) => TeamFilterToLabelMap[filter],
                onUpdate: teamStore().setFilter,
            }, 
            {
                chosenOption: teamStore().sortBy,
                options: allSortBys,
                toHeaderLabel: (sortBy: TeamSortBy) => {
                    return TeamSortByToLabelMap[sortBy]?.toLowerCase()
                },
                toOptionLabel: (sortBy: TeamSortBy) => TeamSortByToLabelMap[sortBy],
                onUpdate: teamStore().setSortBy,
            }
        ] as [
            ListHeaderOptionConfig<TeamFilter>, 
            ListHeaderOptionConfig<TeamSortBy> 
        ]
    }

    const goToResponder =  (user: ClientSideFormat<ProtectedUser>) => {
        return (event: GestureResponderEvent) => {
            event.stopPropagation()

            userStore().pushCurrentUser(user);
            navigateTo(routerNames.userDetails);
        }
    }

    const handleScroll = (e) => {
        setIsScrolled(e.nativeEvent.contentOffset.y == 0
            ? false
            : true)}

    return (
        <View style={styles.container}>
            <ListHeader { ...headerProps } />
            <ScrollView style={styles.scrollView} onScroll={handleScroll} scrollEventThrottle={120}>
                {
                    teamStore().sortedUsers.map(r => {
                        const goToDetails = goToResponder(r);

                        return (
                            <>
                                <Pressable onPress={goToDetails} style={styles.listItemContainer}>
                                    <ResponderRow onPress={goToDetails} style={styles.responderRow} key={r.id} responder={r} orgId={userStore().currentOrgId} />
                                    <IconButton
                                        style={styles.goToResponderIcon}
                                        icon={ICONS.openListItem} 
                                        color={styles.goToResponderIcon.color}
                                        size={styles.goToResponderIcon.width} />
                                </Pressable>
                                <View style={styles.divider}/>
                            </>
                        )
                    })
                } 
            </ScrollView>
        </View>
    )

})

export default TeamList

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgrounds.standard,
        flex: 1,
    },
    scrollView: { 
        flex: 1 
    },
    responderRow: {
        flex: 1,
        marginBottom: 0
    },
    closedFilterHeader: {
        // marginBottom: 12
    },
    goToResponderIcon: {
        color: '#CCCACC',
        width: 30,
        height: 30,
        margin: 0,
        padding: 0,
        marginLeft: 12,
        alignSelf: 'center'
    },
    listItemContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: 12, 
        paddingVertical: 16
    },
    divider: {
        height: 1, 
        borderBottomColor: Colors.borders.list, 
        borderBottomWidth: 1, 
        marginLeft: 60
    }
})