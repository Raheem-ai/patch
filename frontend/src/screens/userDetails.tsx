import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Button, IconButton, Text } from "react-native-paper";
import { RequestSkillToLabelMap, UserRoleToLabelMap } from "../../../common/models";
import HelpRequestCard from "../components/requestCard/helpRequestCard";
import Tags from "../components/tags";
import { visualDelim } from "../constants";
import { navigationRef } from "../navigation";
import { linkingStore, requestStore, userStore } from "../stores/interfaces";
import { Colors, ScreenProps } from "../types";

type Props = ScreenProps<'UserDetails'>;

const UserDetails = observer(({ navigation, route }: Props) => {
    const [ loading, setLoading ] = useState(false)

    const header = () => {
        const startCall = async () => {
            if (userStore().currentUser.phone) {
                await linkingStore().call(userStore().currentUser.phone)
            }
        }

        const mailTo = async () => {
            if (userStore().currentUser.email) {
                await linkingStore().mailTo(userStore().currentUser.email)
            }
        }

        const detailsText = [
            userStore().currentUser.pronouns,
            // TODO: add location here?
            ...userStore().currentUser.organizations[userStore().currentOrgId].roles.map(r => UserRoleToLabelMap[r])
        ].filter(text => !!text).join(` ${visualDelim} `);

        return <View style={styles.headerContainer}>
            <View style={styles.profilePhotoContainer}>
                <IconButton
                    style={styles.profilePhotoIcon}
                    icon='camera-plus' 
                    color={styles.profilePhotoIcon.color}
                    size={styles.profilePhotoIcon.width} />
            </View>
            <View style={styles.nameContainer}>
                <Text style={styles.nameText}>{userStore().currentUser.name}</Text>
            </View>
            <View style={styles.detailsContainer}>
                <Text style={styles.detailsText}>{detailsText}</Text>
            </View>
            <View style={styles.skillsContainer}>
                <Tags 
                centered
                    tags={userStore().currentUser.skills.map(skill => RequestSkillToLabelMap[skill])} 
                    verticalMargin={12} 
                    tagTextStyle={{ color: styles.skillTag.color }}
                    tagContainerStyle={{ backgroundColor: styles.skillTag.backgroundColor }}/>
            </View>
            <View style={styles.bioContainer}>
                <Text style={styles.detailsText}>{userStore().currentUser.bio}</Text>
            </View>
            <View style={styles.contactIconsContainer}>
                <Pressable onPress={startCall} style={styles.contactIconContainer}>
                    <IconButton
                        style={styles.contactIcon}
                        icon='phone' 
                        color={styles.contactIcon.color}
                        size={styles.contactIcon.width} />
                </Pressable>
                <Pressable onPress={mailTo} style={styles.contactIconContainer}>
                    <IconButton
                        style={styles.contactIcon}
                        icon='email' 
                        color={styles.contactIcon.color}
                        size={styles.contactIcon.width} />
                </Pressable>
            </View>
        </View>
    }

    const currentResponse = () => {
        if (!requestStore().currentUserActiveRequests.length) {
            return null
        } 


        return <View style={styles.currentResponseSection}>
            <View style={styles.currentResponseLabelContainer}>
                <View style={styles.currentResponseIndicator}></View>
                <Text style={styles.currentResponseText}>Responding</Text>
            </View>
            {
                requestStore().currentUserActiveRequests.map(r => {
                    return (
                        <HelpRequestCard style={styles.activeRequestCard} request={r}/>
                    )
                })
            }
        </View>
    }

    const upcomingShifts = () => {
        return null
    }

    const pastResponses = () => {
        return null
    }

    if (loading) {
        return null
    }

    return <ScrollView showsVerticalScrollIndicator={false}>
        { header() }
        { currentResponse() }
        { upcomingShifts() }
        { pastResponses() }
    </ScrollView>
})

export default UserDetails;

const styles = StyleSheet.create({
    headerContainer: {
        padding: 24,
        backgroundColor: '#F2F2F2',
    },
    profilePhotoContainer: {
        marginTop: 38,
        height: 84,
        width: 84,
        backgroundColor: Colors.secondary.alpha,
        alignContent: 'center',
        justifyContent: 'center',
        borderRadius: 84,
        alignSelf: 'center'
    },
    profilePhotoIcon: {
        margin: 0,
        width: 30,
        maxWidth: 50,
        maxHeight: 50,
        color: Colors.secondary.beta,
        alignSelf: 'center'
    },
    nameContainer: {
        alignSelf: 'center',
        paddingTop: 24
    },
    nameText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#111'
    },
    detailsText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#333'
    },
    detailsContainer: {
        alignSelf: 'center',
        marginVertical: 12
    },
    skillsContainer: {
        alignSelf: 'center',
    }, 
    skillTag: {
        color: '#fff',
        backgroundColor: Colors.secondary.alpha
    },
    bioContainer: {
        alignSelf: 'center',
        marginVertical: 12
    },
    contactIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'center'
    },
    contactIconContainer: {
        marginHorizontal: 20,
        height: 64,
        width: 64,
        borderRadius: 64,
        backgroundColor: '#F9F6FA',
        justifyContent: 'center'
    },
    contactIcon: {
        margin: 0,
        width: 40,
        maxWidth: 60,
        maxHeight: 60,
        color: Colors.primary.alpha,
        alignSelf: 'center'
    },
    actionButtonsContainer: {
        alignContent: 'center',
        marginVertical: 20
    },
    actionButton: {
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 24,
        height: 44,
        justifyContent: 'center',
        marginHorizontal: 38
    },
    currentResponseSection: {
        backgroundColor: '#fff',
        padding: 20
    },
    currentResponseLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignContent: 'center'
    },
    currentResponseIndicator: {
        height: 12,
        width: 12,
        borderRadius: 12,
        backgroundColor: '#5ACC7F',
        alignSelf: 'center',
        marginRight: 12
    },
    currentResponseText: {
        color: '#5ACC7F',
        fontSize: 14,
        fontWeight: 'bold'
    },
    activeRequestCard: {
        borderRadius: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#5ACC7F',
        borderColor: '#5ACC7F',
        borderWidth: 2,
        marginTop: 12
    }
})