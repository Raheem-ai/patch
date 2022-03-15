import React, { useState } from "react"
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { InteractiveHeaderHeight } from "./header/header";
import { VisualArea } from "./helpers/visualArea";

type TabConfig = {
    label : string,
    view: React.ReactNode
}

type Props = {
    tabs: TabConfig[]
    defaultTab?: string,
};

/**
 *  Used as top level of screen component
 *  <TabbedScreen defaultTab='BAR' tabs={[ 
        { label: 'FOO', view: fooContent() },  
        { label: 'BAR', view: barContent() }, 
        { label: 'BAZ', view: bazContent() }
    ]}/>    
 * 
 */

const TabbedScreen: React.FC<Props> = ({
    tabs,
    defaultTab,
}: Props) => {
    const [ selectedTab, setSelectedTab ] = useState<TabConfig>(null);
    
    return (
        <VisualArea>
            <View style={styles.header}>
                <ScrollView horizontal >
                    {
                        tabs.map((t, i) => {
                            const selected = !!selectedTab
                                ? t.label == selectedTab.label
                                : !!defaultTab
                                    ? t.label == defaultTab
                                    : i == 0;

                            return (
                                <Pressable onPress={() => setSelectedTab(t)} style={[
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
                </ScrollView>
            </View>
            <View style={styles.body}>
                {
                    selectedTab?.view || tabs?.[0]?.view
                }
            </View>
        </VisualArea>
    )
}

export default TabbedScreen;

const styles = StyleSheet.create({
    header: {
        height: InteractiveHeaderHeight - 12,
        width: Dimensions.get('screen').width,
        paddingTop: 16,
        backgroundColor: '#000'
    },
    body: {
        flex: 1,
    }, 
    headerLabel: {
        fontSize: 16,
        color: '#666'
    },
    selectedHeaderLabel: {
        color: '#fff'
    },
    headerSection: {
        paddingHorizontal: 4,
        marginHorizontal: 8,
    },
    firstSection: {
        marginLeft: 16,
    }, 
    lastSection: {
        marginRight: 16,
    },
    selectedSection: {
        borderBottomColor: '#fff',
        borderBottomWidth: 3
    }

})