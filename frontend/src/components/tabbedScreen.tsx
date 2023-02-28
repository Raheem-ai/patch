import React, { useEffect, useState } from "react"
import { Dimensions, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { VisualArea } from "./helpers/visualArea";
import { Colors } from "../types";
import { TabbedScreenHeaderHeight } from "../constants";
import { navigationStore } from "../stores/interfaces";
import { runInAction } from "mobx";
import TestIds from "../test/ids";

type TabConfig = {
    label : string,
    view: () => JSX.Element
}

type Props = {
    testID: string
    tabs: TabConfig[]
    defaultTab?: string,
    scrollableHeader?: boolean // default to evenly spaced headers but alow for scrolling when necessary
    bodyStyle?: ViewStyle
};

/**
 *  Used as top level of screen component
 * 
 * NOTE: currently the state around the selected tab only
 * lasts as long as this component. This can be pulled into stores later
 * 
 * NOTE: labels also double as the key that is used to
 * keep track of the active/default tab. Having duplicate labels
 * will cause errors.
 * 
 *  @example 
 * const fooContent = () => {...}
 * const barContent = () => {...}
 * const bazContent = () => {...}
 * 
 * <TabbedScreen defaultTab='BAR' tabs={[ 
        { label: 'FOO', view: fooContent },  
        { label: 'BAR', view: barContent }, 
        { label: 'BAZ', view: bazContent }
    ]}/>    
 * 
 */

const TabbedScreen: React.FC<Props> = ({
    testID,
    tabs,
    defaultTab,
    scrollableHeader,
    bodyStyle
}: Props) => {
    const initialTab = defaultTab
        ? tabs.find((t) => t.label == defaultTab) || null
        : tabs[0] || null;
    
    useEffect(() => {
        runInAction(() => {
            navigationStore().currentTab = initialTab.label
        })
    }, [])

    const selectTab = (tab: TabConfig) => {
        setSelectedTab(tab)
        
        runInAction(() => {
            navigationStore().currentTab = tab.label
        })
    }

    const [ selectedTab, setSelectedTab ] = useState<TabConfig>(initialTab);

    const renderTabs = () => {
        return tabs.map((t, i) => {
            const selected = !!selectedTab
                ? t.label == selectedTab.label
                : !!defaultTab
                    ? t.label == defaultTab
                    : i == 0;

            return (
                <Pressable testID={TestIds.tabbedScreen.tabN(testID, i)} key={t.label} onPress={() => selectTab(t)} style={[
                    styles.headerSection,
                    i == 0 ? styles.firstSection : null,
                    i == tabs.length - 1 ? styles.lastSection : null,
                    selected ? styles.selectedSection : null
                ]}>
                    <Text style={[
                        styles.headerLabel,
                        selected ? styles.selectedHeaderLabel : null
                    ]}>{t.label}</Text>
                </Pressable>
            )
        })
    }

    const SelectedTab = selectedTab?.view;

    return (
        <VisualArea>
            <View style={styles.header}>
                { !!scrollableHeader
                    ? <ScrollView horizontal>
                        {
                            renderTabs()
                        }
                    </ScrollView>
                    : <View style={{ flexGrow: 1, flexShrink: 1, flexDirection: 'row', justifyContent: 'space-evenly' }}>
                        {
                            renderTabs()
                        }
                    </View>
                }
            </View>
            {/* without this key, it won't rerender if the tab content has the same shape 
                ie. two <Form /> components even if they have different internals
            */}
            <View key={selectedTab.label} style={[styles.body, bodyStyle]}>
                {
                    SelectedTab
                        ? <SelectedTab/>
                        : null
                }
            </View>
        </VisualArea>
    )
}

export default TabbedScreen;

const styles = StyleSheet.create({
    header: {
        height: TabbedScreenHeaderHeight,
        width: Dimensions.get('screen').width,
        backgroundColor: Colors.backgrounds.tabs,
    },
    body: {
        flex: 1,
    }, 
    headerLabel: {
        fontSize: 16,
        color: Colors.text.tertiaryReversed,
        textTransform: "uppercase",
    },
    selectedHeaderLabel: {
        color: Colors.text.defaultReversed
    },
    headerSection: {
        paddingHorizontal: 4,
        marginHorizontal: 8,
        paddingTop: 16,
    },
    firstSection: {
        marginLeft: 16,
    }, 
    lastSection: {
        marginRight: 16,
    },
    selectedSection: {
        borderBottomColor: Colors.backgrounds.standard,
        borderBottomWidth: 3
    }
})
