import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Button, IconButton, Text } from "react-native-paper";
import { RequestSkillToLabelMap, UserRoleToLabelMap } from "../../../common/models";
import HelpRequestChatPreview from "../components/chats/helpRequestChatPreview";
import Tags from "../components/tags";
import { visualDelim } from "../constants";
import { navigationRef } from "../navigation";
import { linkingStore, requestStore, userStore } from "../stores/interfaces";
import { Colors, ScreenProps } from "../types";

type Props = ScreenProps<'Chats'>;

const Chats = observer(({ navigation, route }: Props) => {
    const [ loading, setLoading ] = useState(false)
    const requests = () => {
        if (!requestStore().activeRequests.length) {
            return null
        } 

        return <View style={styles.requestSection}>
            {
                requestStore().activeRequests.map((r, idx) => {
                    const style = !idx
                                  ? { marginTop: 20 }
                                  : null

                    return (
                        <HelpRequestChatPreview style={style} request={r}/>
                    )
                })
            }
        </View>
    }

    if (loading) {
        return null
    }

    return <ScrollView showsVerticalScrollIndicator={false}>
        { requests() }
    </ScrollView>
})

export default Chats;

const styles = StyleSheet.create({
    requestSection: {
        backgroundColor: '#fff',
    }
})