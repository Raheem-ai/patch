import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { HelpRequestFilter, HelpRequestSortBy } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import HelpRequestCard from "../components/requestCard/helpRequestCard";
import ListHeader, { ListHeaderOptionConfig, ListHeaderProps } from "../components/listHeader";
import { requestStore } from "../stores/interfaces";
import { ScreenProps } from "../types";
import TestIds from "../test/ids";

type Props = ScreenProps<'HelpRequestList'>;

const HelpRequestFilterToLabelMap: { [key in HelpRequestFilter] : string } = {
    [HelpRequestFilter.Active]: 'Active',
    [HelpRequestFilter.Closed]: 'Archived',
    [HelpRequestFilter.All]: 'All'
}

const HelpRequestSortByToLabelMap: { [key in HelpRequestSortBy] : string } = {
    [HelpRequestSortBy.ByTime]: 'By time',
    [HelpRequestSortBy.ByStatus]: 'By status',
    [HelpRequestSortBy.BySeverity]: 'By priority'
    // [HelpRequestSortBy.ByDistance]: 'By distance'
}

const HelpRequestList = observer(({ navigation, route }: Props) => {
    const allFilters = allEnumValues<HelpRequestFilter>(HelpRequestFilter);
    const allSortBys = allEnumValues<HelpRequestSortBy>(HelpRequestSortBy)

    const [isScrolled, setIsScrolled] = useState(false);

    const headerProps: ListHeaderProps = {
        openHeaderLabel: 'Requests to show',
        closedHeaderStyles: styles.closedFilterHeader,
        viewIsScrolled: isScrolled,
        optionConfigs: [
            {
                chosenOption: requestStore().filter,
                options: allFilters,
                toHeaderLabel: (filter: HelpRequestFilter) => {
                    return `${HelpRequestFilterToLabelMap[filter]} requests`
                },
                toOptionLabel: (filter: HelpRequestFilter) => HelpRequestFilterToLabelMap[filter],
                onUpdate: requestStore().setFilter,
            },
            {
                chosenOption: requestStore().sortBy,
                options: allSortBys,
                toHeaderLabel: (sortBy: HelpRequestSortBy) => {
                    return HelpRequestSortByToLabelMap[sortBy].toLowerCase()
                },
                toOptionLabel: (sortBy: HelpRequestSortBy) => HelpRequestSortByToLabelMap[sortBy],
                onUpdate: requestStore().setSortBy,
            }
        ] as [
            ListHeaderOptionConfig<HelpRequestFilter>, 
            ListHeaderOptionConfig<HelpRequestSortBy> 
        ]
    }
    const handleScroll = (e) => {
        setIsScrolled(e.nativeEvent.contentOffset.y <= 4
            ? false
            : true)}

    return (
        <View style={styles.container} testID={TestIds.requestList.screen}>
            <ListHeader { ...headerProps } />
            <ScrollView style={{ flex: 1, paddingTop: 12 }} onScroll={handleScroll} scrollEventThrottle={120}>
                {
                    requestStore().filteredSortedRequests.map(r => {
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
        // marginBottom: 12
    }
})