import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { List } from "react-native-paper";
import { HelpRequestFilter, HelpRequestSortBy } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import HelpRequestCard from "../components/helpRequestCard";
import ListHeader, { ListHeaderProps } from "../components/listHeader";
import { IRequestStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { ScreenProps, routerNames } from "../types";

type Props = ScreenProps<'HelpRequestList'>;

const HelpRequestFilterToLabelMap: { [key in HelpRequestFilter] : string } = {
    [HelpRequestFilter.Active]: 'Active',
    [HelpRequestFilter.Finished]: 'Finished',
    [HelpRequestFilter.All]: 'All'
}

const HelpRequestSortByToLabelMap: { [key in HelpRequestSortBy] : string } = {
    [HelpRequestSortBy.ByTime]: 'By time',
    [HelpRequestSortBy.ByStatus]: 'By status',
    // [HelpRequestSortBy.BySeverity]: 'By severity',
    // [HelpRequestSortBy.ByDistance]: 'By distance'
}

const HelpRequestList = observer(({ navigation, route }: Props) => {
    const requestStore = getStore<IRequestStore>(IRequestStore);

    const allFilters = allEnumValues<HelpRequestFilter>(HelpRequestFilter);
    const allSortBys = allEnumValues<HelpRequestSortBy>(HelpRequestSortBy)

    const headerProps: ListHeaderProps<HelpRequestFilter, HelpRequestSortBy> = {
        openHeaderLabel: 'Requests to show',
        chosenFilter: requestStore.filter,
        chosenSortBy: requestStore.sortBy,
    
        filters: allFilters,
        sortBys: allSortBys,
    
        filterToHeaderLabel: (filter: HelpRequestFilter) => {
            return `${HelpRequestFilterToLabelMap[filter]} requests`
        },
        sortByToHeaderLabel: (sortBy: HelpRequestSortBy) => {
            return HelpRequestSortByToLabelMap[sortBy].toLowerCase()
        },
        filterToOptionLabel: (filter: HelpRequestFilter) => HelpRequestFilterToLabelMap[filter],
        sortByToOptionLabel: (sortBy: HelpRequestSortBy) => HelpRequestSortByToLabelMap[sortBy],
    
        onFilterUpdate: requestStore.setFilter,
        onSortByUpdate: requestStore.setSortBy,

        closedHeaderStyles: styles.closedFilterHeader
    }
    
    return (
        <View style={styles.container}>
            <ListHeader<HelpRequestFilter, HelpRequestSortBy> 
                { ...headerProps } />
            <ScrollView style={{ flex: 1}}>
                {
                    requestStore.sortedRequests.map(r => {
                        return (
                            <HelpRequestCard style={styles.card} key={r.id} request={r} />
                        )
                    })
                }
            </ScrollView>
        </View>
    )

})

export default HelpRequestList

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f0f0',
        flex: 1,
    },
    card: {
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowRadius: 2,
        shadowOffset: {
            width: 0,
            height: 1
        }
    },
    closedFilterHeader: {
        marginBottom: 12
    }
})