import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ProtectedUser, TeamFilter, TeamSortBy } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import ResponderRow from "../components/responderRow";
import ListHeader, { ListHeaderProps } from "../components/listHeader";
import { ITeamStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { ScreenProps, routerNames } from "../types";
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
    [TeamSortBy.BySkill]: 'By skill',
}

const TeamList = observer(({ navigation, route }: Props) => {
    const teamStore = getStore<ITeamStore>(ITeamStore);
    const userStore = getStore<IUserStore>(IUserStore);

    const allFilters = allEnumValues<TeamFilter>(TeamFilter);
    const allSortBys = allEnumValues<TeamSortBy>(TeamSortBy);

    useEffect(() => {
        teamStore.refreshUsers();
    }, [])

    const headerProps: ListHeaderProps<TeamFilter, TeamSortBy> = {
        openHeaderLabel: 'People to show',
        chosenFilter: teamStore.filter,
        chosenSortBy: teamStore.sortBy,
    
        filters: allFilters,
        sortBys: allSortBys,
    
        filterToHeaderLabel: (filter: TeamFilter) => {
            return filter == TeamFilter.Everyone 
                ? TeamFilterToLabelMap[filter] 
                : `${TeamFilterToLabelMap[filter]} people`;
        },
        sortByToHeaderLabel: (sortBy: TeamSortBy) => {
            return TeamSortByToLabelMap[sortBy].toLowerCase()
        },
        filterToOptionLabel: (filter: TeamFilter) => TeamFilterToLabelMap[filter],
        sortByToOptionLabel: (sortBy: TeamSortBy) => TeamSortByToLabelMap[sortBy],
    
        onFilterUpdate: teamStore.setFilter,
        onSortByUpdate: teamStore.setSortBy,

        closedHeaderStyles: styles.closedFilterHeader
    }

    const goToResponder =  (user: ClientSideFormat<ProtectedUser>) => {
        return () => {
            userStore.pushCurrentUser(user);
            navigateTo(routerNames.userDetails);
        }
    }
    
    return (
        <View style={styles.container}>
            <ListHeader<TeamFilter, TeamSortBy> 
                { ...headerProps } />
            <ScrollView style={styles.scrollView}>
                {
                    teamStore.sortedUsers.map(r => {
                        return (
                            <View onTouchStart={goToResponder(r)} style={styles.listItemContainer}>
                                <ResponderRow style={styles.responderRow} key={r.id} responder={r} orgId={userStore.currentOrgId} />
                                <IconButton
                                    style={styles.goToResponderIcon}
                                    icon='chevron-right' 
                                    color={styles.goToResponderIcon.color}
                                    size={styles.goToResponderIcon.width} />
                            </View>
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
        backgroundColor: '#fff',
        flex: 1,
    },
    scrollView: { 
        flex: 1, 
        paddingTop: 20 
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
        marginBottom: 30 
    }
})