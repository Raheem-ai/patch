import * as React from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { StyleSheet } from "react-native";
import { IconButton, Switch, Text } from 'react-native-paper';
import { MainMenuOption, MainMenuOptions, navigateTo, SubMenuOption, SubMenuOptions } from '../../navigation';
import { RootStackParamList, routerNames, Colors, ICONS } from '../../types';
import { observer } from 'mobx-react';
import HeaderConfig, { HeaderRouteConfig } from './headerConfig';
import { headerStore, IHeaderStore, IUserStore, requestStore, userStore, alertStore, formStore, connectionStore } from '../../stores/interfaces';
import Constants from 'expo-constants';
import { HeaderHeight, headerIconContainerSize, headerIconSize, headerIconPaddingHorizontal, InteractiveHeaderHeight, isAndroid, HeaderAnnouncementHeight } from '../../constants';
import { unwrap } from '../../../../common/utils';
import TestIds from '../../test/ids';
import STRINGS from '../../../../common/strings';

type Props = StackHeaderProps & {};

const Header = observer((props: Props) => {
    if (!props.navigation.isFocused()) {
        return null;
    }

    const dimensions = Dimensions.get('screen');
    const config: HeaderRouteConfig = unwrap(HeaderConfig[props.route.name]);
    
    const title = typeof config.title == 'string'
        ? config.title
        : config.title();

    const openHeader = () => {
        headerStore().open()
    }

    const closeHeader = () => headerStore().close()

    const headerBar = () => {
        if (config.unauthenticated) {
            return null;
        }

        const leftActions = config.leftActions && config.leftActions.length
            ? config.leftActions
            : [{ icon: ICONS.menu, callback: openHeader }];

        const rightActions = config.rightActions && config.rightActions.length
            ? config.rightActions
            : []

        // TODO: figure out the right animation for this
        const opacity = Animated.add(props.progress.current, props.progress.next || 0).interpolate({
            inputRange: [0, .2, .8, 1, 1.2, 1.8, 2],
            outputRange: [0, 0, 0, 1, 0, 0, 0],
        });

        const statusIcon = requestStore().myActiveRequests.length
            ? userStore().isOnDuty
                ? ICONS.userStatusOnRequestOnDuty
                : ICONS.userStatusOnRequestOffDuty
            : userStore().isOnDuty
                ? ICONS.userStatusOnDuty
                : ICONS.userStatusOffDuty;

        const statusColor = requestStore().myActiveRequests.length
            ? Colors.good
            : userStore().isOnDuty
                ? Colors.good
                : Colors.icons.darkReversed;

        const promptToToggleAvailability = () => {
            alertStore().showPrompt({
                title:  STRINGS.INTERFACE.availabilityAlertTitle,
                message: STRINGS.INTERFACE.availabilityAlertMessage(userStore().isOnDuty),
                actions: [
                    {
                        label: `${userStore().isOnDuty ? STRINGS.INTERFACE.available(true) : STRINGS.INTERFACE.unavailable(true)}`,
                        onPress: () => {}
                    },
                    {   
                        label: `${userStore().isOnDuty ? STRINGS.INTERFACE.unavailable(true) : STRINGS.INTERFACE.available(true)}`,
                        onPress: () => userStore().toggleOnDuty(),
                        confirming: true
                    }
                ]
            })
        }

        const statusIconSize = 16;

        const rightActionsRefs = [];

        const rightActionsMap = rightActions.map((a, index) => {
            return (
                <IconButton 
                    testID={a.testId}
                    key={a.icon} 
                    style={[styles.icon, {marginLeft: (index == 0 ? 0 : 12)}]} 
                    icon={a.icon} 
                    size={headerIconSize} 
                    color={Colors.icons.lightReversed} 
                    onPress={a.callback}/>
            )
        })   

        const connectionAnnouncement = () => {
            return (
                <Animated.View style={[styles.anouncementContainer, { height: headerStore().announcementHeight }]}>
                    <Text style={styles.anouncementContainerText}>{STRINGS.connectionUnreliable()}</Text>
                </Animated.View>
            )
        }

        return (
            <View sentry-label='Header (closed)' style={{ backgroundColor: styles.container.backgroundColor }}>
                <Animated.View style={[{ opacity }, styles.container]}>
                    { connectionAnnouncement() }
                    <View style={styles.iconBarContainer}>
                        {   leftActions.length
                            ? <View style={styles.leftIconContainer}>
                                {
                                    leftActions.map((a) => {
                                        const testId = a.icon == 'menu'
                                            ? TestIds.header.menu
                                            : a.testId || null;

                                        return (
                                            <IconButton 
                                                testID={testId} 
                                                style={styles.leftIcon}
                                                key={a.icon} 
                                                icon={a.icon} 
                                                size={headerIconSize} 
                                                color={Colors.icons.lightReversed} 
                                                onPress={a.callback}/>
                                        )
                                    })
                                }
                            </View>
                            : null
                        }
                        <View style={[styles.titleContainer, leftActions.length ? null : { paddingLeft: 24 }]}>
                            <Text style={title.length <= 16 ? styles.title : styles.titleLong} numberOfLines={1}>{title}</Text>
                        </View>

                        <View style={styles.rightIconContainer}>
                            {rightActionsMap}
                        </View>
                        {/* Add a divider line between right icons and status icon */}
                        { rightActions.length
                            ? <View style={{ flexDirection: 'row', height: InteractiveHeaderHeight, alignItems: 'center', paddingLeft: 6, paddingRight: 12 }}>
                                <View style={{ borderLeftColor: Colors.icons.dark, borderLeftWidth: 1, height: '60%' }}></View>
                            </View>
                            : null
                        }
                        { 
                            <View style={[styles.onDutyStatusContainer, {marginRight: 12 }]}>
                                <IconButton 
                                    key={'status-icon'} 
                                    style={{ width: statusIconSize, height: statusIconSize }} 
                                    icon={statusIcon} 
                                    size={statusIconSize} 
                                    color={statusColor}
                                    onPress={promptToToggleAvailability}/>
                            </View>
                        }
                    </View>
                </Animated.View>
            </View>
        )
    }

    const mainMenuOptions = () => {
        const style = {
            ...styles.mainMenuOptions,
            ...styles.noDynamicContent
        }

        const onPress = (opt: MainMenuOption) => {
            return () => {
                if (opt.disabled) {
                    return;
                }

                navigateTo(routerNames[opt.routeTo])
                formStore().clearDepth()
                closeHeader()
            }
        }

        const option = (opt: MainMenuOption) => {
            return (
                <Text 
                    testID={opt.testId}
                    key={opt.name} 
                    style={[
                        styles.mainMenuText, 
                        opt.disabled ? styles.disabledMainMenuText : null
                    ]} 
                    onPress={onPress(opt)}
                >{opt.name}</Text>
            )
        }

        return (
            <View style={style}>
                {MainMenuOptions.map(option)}
            </View>
        )
    }

    const subMenuOptions = () => {
        const onPress = (opt: SubMenuOption) => {
            return () => {
                if (opt.disabled) {
                    return;
                }

                if (opt.routeTo) {
                    navigateTo(routerNames[opt.routeTo])
                    formStore().clearDepth()
                } else if (opt.onPress) {
                    opt.onPress()
                }

                closeHeader()
            }
        }

        return (
            <View style={styles.subMenuOptions}>
                {SubMenuOptions.map(opt => <Text key={opt.name} style={[styles.subMenuText, opt.disabled ? styles.disabledSubMenuText : null]} onPress={onPress(opt)}>{opt.name}</Text>)}
            </View>
        )
    }
    
    const fullScreenHeader = () =>
        <View sentry-label='Header (open)' style={{ ...styles.fullScreenContainer, ...{ height: dimensions.height - (isAndroid ? Constants.statusBarHeight - 1 : 0 )}}}>
            <View style={styles.fullScreenHeaderContainer}>
                <View style={styles.leftIconContainer}>
                    <IconButton icon={ICONS.navCancel} size={headerIconSize} color={Colors.icons.lightReversed} onPress={closeHeader}/>
                </View>
                <View style={styles.onDutySwitchContainer}>
                    <Text style={[styles.onDutyText, userStore().isOnDuty ? {} : styles.offDutyText]}>{userStore().isOnDuty ? 'Available' : 'Unavailable'}</Text>
                    <Switch
                        value={userStore().isOnDuty} 
                        onValueChange={() => userStore().toggleOnDuty()} 
                        color={Colors.good}
                        thumbColor={userStore().isOnDuty ? Colors.uiControls.foregroundReversed : Colors.uiControls.foregroundDisabledReversed}
                        trackColor={{ false: Colors.uiControls.backgroundDisabledReversed, true: Colors.good }}
                        ios_backgroundColor={Colors.uiControls.backgroundDisabledReversed}
                    />
                </View>
            </View>
            <View style={styles.fullScreenContent}>
                { mainMenuOptions() }
                { subMenuOptions() }
            </View>
        </View>

    return headerStore().isOpen
        ? fullScreenHeader()
        : headerBar()
})

export default Header;

// const windowDimensions = Dimensions.get("screen"); // this should probably be more dynamic  


const styles = StyleSheet.create({
    // CLOSED
    container: {
        minHeight: HeaderHeight,
        maxHeight: HeaderHeight + HeaderAnnouncementHeight,
        paddingTop: Constants.statusBarHeight,
        backgroundColor: Colors.backgrounds.menu,
    },
    anouncementContainer: {
        height: HeaderAnnouncementHeight,
        backgroundColor: Colors.secondary.alpha,
        alignContent: 'center'
    },
    anouncementContainerText: {
        lineHeight: HeaderAnnouncementHeight,
        color: Colors.text.defaultReversed,
        textAlign: 'center'
    },
    iconBarContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    leftIconContainer: {
        height: InteractiveHeaderHeight,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    leftIcon: {
        margin: 0,
        width: headerIconSize,
        height: headerIconSize,
        alignSelf: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: InteractiveHeaderHeight,
    },
    title: {
        color: Colors.text.defaultReversed,
        fontSize: 20
    },
    titleLong: {
        color: Colors.text.defaultReversed,
        fontSize: 16,
    },
    onDutyStatusContainer: {
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: InteractiveHeaderHeight,
    },
    rightIconContainer: {
        flexDirection: 'row',
        height: InteractiveHeaderHeight,
        paddingRight: 12,
    },
    icon: {
        margin: 0,
        width: headerIconSize,
        height: headerIconSize,
        alignSelf: 'center',
        borderRadius: 0
    },

    // OPEN
    fullScreenContainer: {
        backgroundColor: Colors.backgrounds.menu,
    },
    fullScreenHeaderContainer: {
        height: HeaderHeight,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent:'space-between'
    },
    onDutySwitchContainer: {
        height: InteractiveHeaderHeight,
        alignItems: 'center',
        marginRight: 12,
        flexDirection: 'row'
    },
    onDutyText: {
        color: Colors.text.defaultReversed,
        fontSize: 18,
        marginRight: 12,
        fontWeight: 'normal'
    },
    offDutyText: {
        color: Colors.text.secondaryReversed,
        fontWeight: 'normal'
    },
    fullScreenContent: {
        flex: 1,
        marginLeft: headerIconContainerSize,
    }, 
    mainMenuOptions: {

    },
    noDynamicContent: {
        flex: 1
    },
    dynamicContent: {
        flex: 1,
        borderTopColor: Colors.borders.menu,
        borderWidth: 1,
        marginVertical: 10
    },
    subMenuOptions: {
        borderTopColor: Colors.borders.menu,
        borderTopWidth: 1,
        paddingTop: 10,
        paddingBottom: 26
    },
    mainMenuText: {
        color: Colors.text.defaultReversed,
        marginVertical: 10,
        fontSize: 24, 
        fontWeight: 'bold'
    },
    disabledMainMenuText: {
        color: Colors.text.disabledReversed
    },
    subMenuText: {
        color: Colors.text.defaultReversed,
        marginVertical: 10,
        fontSize: 18
    },
    disabledSubMenuText: {
        color: Colors.text.disabledReversed
    }
});