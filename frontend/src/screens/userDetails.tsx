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
import { linkingStore, requestStore, userStore, manageAttributesStore, organizationStore, } from "../stores/interfaces";
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
        const attributes = (userStore().currentUser.organizations[userStore().currentOrgId]?.attributes || []).map(attr => manageAttributesStore().getAttribute(attr.categoryId, attr.itemId));
        const roles = userStore().currentUser.organizations[userStore().currentOrgId].roles.map(r => UserRoleToLabelMap[r]);

        const detailsText = [
            userStore().currentUser.pronouns,
            // TODO: add location here?
        ].filter(text => !!text).join(` ${visualDelim} `);

        return <View style={styles.headerContainer}>
            {/* <View style={styles.profilePhotoContainer}>
                <IconButton
                    style={styles.profilePhotoIcon}
                    icon='camera-plus' 
                    color={styles.profilePhotoIcon.color}
                    size={styles.profilePhotoIcon.width} />
            </View> */}
            <View style={styles.nameContainer}>
                <Text style={styles.nameText}>{userStore().currentUser.name}</Text>
            </View>
            <View style={detailsText ? styles.detailsContainer : styles.hideContainer}>
                <Text style={styles.detailsText}>{detailsText}</Text>
            </View>
            <View style={userStore().currentUser.bio ? styles.bioContainer : styles.hideContainer}>
                <Text style={styles.detailsText}>{userStore().currentUser.bio}</Text>
            </View>
            <View style={styles.skillsContainer}>
            <Tags 
                centered
                    tags={roles} 
                    verticalMargin={12} 
                    tagTextStyle={{ color: styles.roleTag.color }}
                    tagContainerStyle={{ backgroundColor: styles.roleTag.backgroundColor }}/>
                <Tags 
                centered
                    tags={attributes.map(attr => attr.name)} 
                    verticalMargin={12} 
                    tagTextStyle={{ color: styles.skillTag.color }}
                    tagContainerStyle={{ backgroundColor: styles.skillTag.backgroundColor }}/>
            </View>
            {/* TODO: only show contact buttons if we have contact information */}
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

    return <ScrollView style={styles.fullPage} showsVerticalScrollIndicator={false}>
        { header() }
        { currentResponse() }
        { upcomingShifts() }
        { pastResponses() }
    </ScrollView>
})

export default UserDetails;

const styles = StyleSheet.create({

    fullPage: {
        backgroundColor: Colors.backgrounds.standard,
    },
    hideContainer: {
        display: 'none'
    },
    headerContainer: {
        padding: 24,
        paddingBottom: 32,
        backgroundColor: Colors.backgrounds.secondary,
        borderBottomColor: Colors.borders.formFields,
        borderBottomWidth: 1,
    },
    profilePhotoContainer: {
        marginTop: 38,
        height: 84,
        width: 84,
        backgroundColor: Colors.backgrounds.secondary,
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
        color: Colors.text.default,
    },
    detailsText: {
        fontSize: 14,
        fontWeight: '400',
        color: Colors.text.secondary,
    },
    detailsContainer: {
        alignSelf: 'center',
        marginTop: 12
    },
    bioContainer: {
        alignSelf: 'center',
        marginVertical: 12
    },
    skillsContainer: {
        alignSelf: 'center',
        marginTop: 12,
    }, 
    roleTag: {
        color: Colors.backgrounds.tags.primaryForeground,
        backgroundColor: Colors.backgrounds.tags.primaryBackground,
    },
    skillTag: {
        color: Colors.backgrounds.tags.tertiaryForeground,
        backgroundColor: Colors.backgrounds.tags.tertiaryBackground
    },
    contactIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    contactIconContainer: {
        marginHorizontal: 24,
        height: 64,
        width: 64,
        borderRadius: 64,
        backgroundColor: Colors.uiControls.foregroundReversed,
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
    currentResponseSection: {
        backgroundColor: Colors.backgrounds.standard,
        padding: 20,
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
        backgroundColor: Colors.good,
        alignSelf: 'center',
        marginRight: 8
    },
    currentResponseText: {
        color: Colors.good,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    activeRequestCard: {
        borderRadius: 8,
        borderBottomWidth: 2,
        borderBottomColor: Colors.good,
        borderColor: Colors.good,
        borderWidth: 2,
        marginTop: 12
    }
})