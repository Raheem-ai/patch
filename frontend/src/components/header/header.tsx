import * as React from 'react';
import { Animated, Dimensions, View, Image } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { StyleSheet } from "react-native";
import { IconButton, Switch, Text } from 'react-native-paper';
import { useState } from 'react';
import { MainMenuOption, MainMenuOptions, navigateTo, SubMenuOption, SubMenuOptions } from '../../navigation';
import { RootStackParamList, routerNames, Colors } from '../../types';
import { observer } from 'mobx-react';
import HeaderConfig, { HeaderRouteConfig } from './headerConfig';
import { headerStore, IHeaderStore, IUserStore, requestStore, userStore } from '../../stores/interfaces';
import Constants from 'expo-constants';
import { isAndroid } from '../../constants';
import { unwrap } from '../../../../common/utils';
import statusAvailable from '../../../assets/statusAvailable.png';
import statusUnavailable from '../../../assets/statusUnavailable.png';
import statusOnshift from '../../../assets/statusOnshift.png';

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
            : [{ icon: 'menu', callback: openHeader }];

        const rightActions = config.rightActions && config.rightActions.length
            ? config.rightActions
            : []

        // TODO: figure out the right animation for this
        const opacity = Animated.add(props.progress.current, props.progress.next || 0).interpolate({
            inputRange: [0, .2, .8, 1, 1.2, 1.8, 2],
            outputRange: [0, 0, 0, 1, 0, 0, 0],
        });
        userStore().pushCurrentUser(userStore().user);
        const statusIcon = requestStore().currentUserActiveRequests.length
            ? statusOnshift
            : userStore().isOnDuty ? statusAvailable : statusUnavailable;

        return (
            <View style={{ backgroundColor: styles.container.backgroundColor }}>
            <Animated.View style={{ opacity }}>
                <View style={styles.container}>
                    {   leftActions.length 
                        ? <View style={styles.leftIconContainer}>
                            {
                                leftActions.map(a => <IconButton key={a.icon} icon={a.icon} size={iconSize} color={Colors.icons.lightReversed} onPress={a.callback}/>)
                            }
                        </View>
                        : null
                    }
                    <View style={[styles.titleContainer, leftActions.length ? null : { paddingLeft: 20 }]}>
                        <Text style={styles.title}>{title}</Text>
                    </View>
                    { 
                        <View style={styles.onDutyStatusContainer}>
                            <Image source={ statusIcon } style={{ width: 24, height: 24 }} /> 
                        </View>
                    }
                    <View style={styles.rightIconContainer}>
                        {
                            rightActions.map(a => <IconButton key={a.icon} style={styles.icon} icon={a.icon} size={iconSize} color={Colors.icons.lightReversed} onPress={a.callback}/>)
                        }
                    </View>
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
                closeHeader()
            }
        }

        return (
            <View style={style}>
                {MainMenuOptions.map(opt => <Text key={opt.name} style={[styles.mainMenuText, opt.disabled ? styles.disabledMainMenuText : null]} onPress={onPress(opt)}>{opt.name}</Text>)}
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
        <View style={{ ...styles.fullScreenContainer, ...{ height: dimensions.height - (isAndroid ? Constants.statusBarHeight - 1 : 0 )}}}>
            <View style={styles.fullScreenHeaderContainer}>
                <View style={styles.leftIconContainer}>
                    <IconButton icon='close' size={iconSize} color={Colors.icons.lightReversed} onPress={closeHeader}/>
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
const iconSize = 30;
const iconPadding = 12;
const iconContainerSize = (2 * iconPadding) + iconSize;
export const InteractiveHeaderHeight = iconContainerSize;

export const HeaderHeight = InteractiveHeaderHeight + Constants.statusBarHeight;

const styles = StyleSheet.create({
    // CLOSED
    container: {
        height: HeaderHeight,
        backgroundColor: Colors.backgrounds.menu,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    leftIconContainer: {
        width: iconContainerSize,
        height: InteractiveHeaderHeight
    },
    titleContainer: {
        flex: 1,
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: InteractiveHeaderHeight
    },
    title: {
        color: Colors.text.defaultReversed,
        fontSize: 20
    },
    onDutyStatusContainer: {
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: InteractiveHeaderHeight,
        marginRight: 12
    },
    onDutyStatusOutline: { 
        borderStyle: 'solid', 
        borderWidth: 1, 
        paddingHorizontal: 4, 
        paddingVertical: 2, 
        borderRadius: 4 
    },
    onDutyStatusText: {  
        fontSize: 11, 
        fontWeight: 'bold' 
    },
    onDuty: {
        color: Colors.good,
    },
    offDuty: {
        color: Colors.icons.darkReversed,
    },
    rightIconContainer: {
        // width: iconContainerSize,
        flexDirection: 'row',
        height: InteractiveHeaderHeight
    },
    icon: {
        margin: 0,
        marginRight: 12,
        width: iconSize,
        height: iconSize,
        alignSelf: 'center'
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
        marginLeft: iconContainerSize,
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