import { observer } from "mobx-react";
import React, { useState } from "react";
import {StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { PatchPermissions } from "../../../common/models";
import HelpRequestChatPreview from "../components/chats/helpRequestChatPreview";
import { requestStore } from "../stores/interfaces";
import { ScreenProps, Colors } from "../types";
import { iHaveAnyPermissions } from "../utils";

type Props = ScreenProps<'Chats'>;

const Chats = observer(({ navigation, route }: Props) => {
    const seeAllRequestChats =  iHaveAnyPermissions([PatchPermissions.SeeAllChats, PatchPermissions.RequestAdmin]);

    const getUserRequests = () => {
        if (seeAllRequestChats) {
            return requestStore().activeRequests;
        } else {
            return requestStore().myActiveRequests;
        }
    }

    const chatFeed = () => {
        if (!getUserRequests().length) {
            return null
        }

        return <View style={styles.requestSection}>
            {
                getUserRequests().map((r, idx) => {
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

    return <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        { chatFeed() }
    </ScrollView>
})

export default Chats;

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: Colors.backgrounds.standard,
        height: '100%'
    },
    requestSection: {
        backgroundColor: Colors.backgrounds.standard,
        marginTop: 24,
    }
})