import { observer } from "mobx-react";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { IconButton, Text } from "react-native-paper";
import HelpRequestCard from "../components/requestCard/helpRequestCard";
import Tags from "../components/tags";
import { linkingStore, requestStore, userStore, manageAttributesStore, organizationStore, } from "../stores/interfaces";
import { Colors, ICONS, ScreenProps } from "../types";
import STRINGS from "../../../common/strings";
import TestIds from "../test/ids";


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

        const pronounsText = userStore().currentUser.pronouns;
        const bioText = userStore().currentUser.bio 
            ? userStore().currentUser.bio
            : null;

        const userRoles = [
            ...organizationStore().userRoles.get(userStore().currentUser.id).map(role => role.name)
        ].filter(text => !!text).join(` ${STRINGS.visualDelim} `);

        const userAttributes = userStore().currentUser.organizations[userStore().currentOrgId].attributes.map(attr => {
            return manageAttributesStore().getAttribute(attr.categoryId, attr.itemId)
        }).filter(x => !!x)

        return <>
            <View style={styles.headerContainer}>
                {/* <View style={styles.profilePhotoContainer}>
                    <IconButton
                        style={styles.profilePhotoIcon}
                        icon={ICONS.addPhoto} 
                        color={styles.profilePhotoIcon.color}
                        size={styles.profilePhotoIcon.width} />
                </View> */}
                <View style={styles.nameContainer}>
                    <Text style={styles.nameText}>{userStore().currentUser.name}</Text>
                </View>
                <View style={pronounsText ? styles.detailsContainer : styles.hideContainer}>
                    <Text style={[styles.detailsText, pronounsText ? [styles.detailsContainer, styles.pronounsText] : styles.hideContainer]}>
                        {pronounsText}
                    </Text>                
                </View>
                <View style={bioText ? styles.detailsContainer : styles.hideContainer}>
                        <Text style={[styles.detailsText, bioText ? [styles.detailsContainer, {marginTop: 16}] : styles.hideContainer]}>
                            {bioText}
                        </Text>
                </View>
                {/* Only show contact buttons if we have contact information */}
                { userStore().currentUser.phone || userStore().currentUser.email
                    ? <View style={styles.contactIconsContainer}>
                        { userStore().currentUser.phone
                            ? <Pressable onPress={startCall} style={styles.contactIconContainer}>
                                <IconButton
                                    style={styles.contactIcon}
                                    icon={ICONS.callPhone} 
                                    color={styles.contactIcon.color}
                                    size={styles.contactIcon.width} />
                            </Pressable>
                            : null }

                        { userStore().currentUser.email
                            ? <Pressable onPress={mailTo} style={styles.contactIconContainer}>
                                <IconButton
                                    style={styles.contactIcon}
                                    icon={ICONS.sendEmail} 
                                    color={styles.contactIcon.color}
                                    size={styles.contactIcon.width} />
                            </Pressable>
                            : null }
                        </View>
                    : null
                }
            </View>
            <View style={!(userRoles.length || userAttributes.length) ? styles.hideContainer : styles.metadataContainer}>
                <View style={!userAttributes.length ? styles.hideContainer : styles.attributesContainer}>
                    <Text style={styles.labelText}>Attributes:</Text> 
                    <Tags 
                        centered
                        tags={userAttributes.map(attr => attr.name)}  
                        verticalMargin={12} 
                        tagTextStyle={{ color: styles.attributeTag.color }}
                        tagContainerStyle={{ backgroundColor: styles.attributeTag.backgroundColor }}/>
                </View>
                <View style={!userRoles.length ? styles.hideContainer : [styles.rolesContainer, userAttributes.length && {marginTop: 24}]}>
                    <View>
                        <Text style={[styles.labelText, {marginBottom: 4}]}>Roles:</Text>
                        <Text style={styles.rolesText}>{userRoles}</Text>
                    </View>
                </View>
            </View>
        </>
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
                        <HelpRequestCard testID={TestIds.requestCard(r.id)} style={styles.activeRequestCard} requestId={r.id}/>
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

    if (loading || !userStore().currentUser) {
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
        paddingHorizontal: 24,
        paddingVertical: 40,
        backgroundColor: Colors.backgrounds.secondary,
    },
    profilePhotoContainer: {
        marginTop: 40,
        height: 84,
        width: 84,
        backgroundColor: Colors.primary.alpha,
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
        color: Colors.text.defaultReversed,
        alignSelf: 'center'
    },
    nameContainer: {
        alignSelf: 'center',

    },
    nameText: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.text.default,
    },
    pronounsText: {
        marginTop: 12,
        color: Colors.text.secondary,
    },
    detailsText: {
        fontSize: 16,
        fontWeight: '400',
        color: Colors.text.secondary,
        textAlign: 'center'
    },
    detailsContainer: {
        alignSelf: 'center',
    },
    bioContainer: {
        alignSelf: 'center',
        marginVertical: 12
    },
    contactIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    contactIconContainer: {
        marginHorizontal: 24,
        height: 64,
        width: 64,
        borderRadius: 64,
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center'
    },
    contactIcon: {
        margin: 0,
        width: 40,
        maxWidth: 60,
        maxHeight: 60,
        color: Colors.text.defaultReversed,
        alignSelf: 'center'
    },
    metadataContainer: {
        paddingHorizontal: 24,
        paddingVertical: 40,
        backgroundColor: Colors.backgrounds.secondary,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: Colors.borders.formFields,
        flex: 1,
        flexDirection: 'column',
        alignContent: 'center',
    },
    attributesContainer: {
        alignSelf: 'center',
    }, 
    attributeTag: {
        color: Colors.backgrounds.tags.tertiaryForeground,
        backgroundColor: Colors.backgrounds.tags.tertiaryBackground,
    },
    rolesContainer: {
        width: '100%'
    },
    labelText: {
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        textAlign: 'center'
    },
    rolesText: {
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        color: Colors.text.secondary,
        textAlign: 'center',
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

        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: .2,
        shadowRadius: 2,
        shadowOffset: {
            width: 0,
            height: 1
        }
    }
})