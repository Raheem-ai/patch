import * as React from 'react';
import { Animated, Dimensions, View } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { StyleSheet } from "react-native";
import { IconButton, Switch, Text } from 'react-native-paper';
import { useState } from 'react';
import { MainMenuOption, MainMenuOptions, navigateTo, SubMenuOption, SubMenuOptions } from '../../navigation';
import { RootStackParamList, routerNames } from '../../types';
import { getStore } from '../../stores/meta';
import { observer } from 'mobx-react';
import HeaderConfig, { HeaderRouteConfig } from './headerConfig';
import { IHeaderStore, IUserStore } from '../../stores/interfaces';
import Constants from 'expo-constants';
import { isAndroid } from '../../constants';
import { unwrap } from '../../../../common/utils';

type Props = StackHeaderProps & {};

const Header = observer((props: Props) => {

    const userStore = getStore<IUserStore>(IUserStore);
    const headerStore = getStore<IHeaderStore>(IHeaderStore);

    const dimensions = Dimensions.get('screen');
    const config: HeaderRouteConfig = unwrap(HeaderConfig[props.route.name]);
    
    const title = typeof config.title == 'string'
        ? config.title
        : config.title();

    // TODO: get this from stores at some point

    const openHeader = () => {
        headerStore.open()
    }

    const closeHeader = () => headerStore.close()

    const headerBar = () => {
        const leftActions = config.leftActions && config.leftActions.length
            ? config.leftActions
            : (config.unauthenticated)
                ? []
                : [{ icon: 'menu', callback: openHeader }];

        const rightActions = config.rightActions && config.rightActions.length
            ? config.rightActions
            : []

        // TODO: figure out the right animation for this
        const opacity = Animated.add(props.progress.current, props.progress.next || 0).interpolate({
            inputRange: [0, .2, .8, 1, 1.2, 1.8, 2],
            outputRange: [0, 0, 0, 1, 0, 0, 0],
        });

        return (
            <View style={{ backgroundColor: styles.container.backgroundColor }}>
            <Animated.View style={{ opacity }}>
                <View style={styles.container}>
                    {   leftActions.length 
                        ? <View style={styles.leftIconContainer}>
                            {
                                leftActions.map(a => <IconButton key={a.icon} icon={a.icon} size={iconSize} color='#fff' onPress={a.callback}/>)
                            }
                        </View>
                        : null
                    }
                    <View style={[styles.titleContainer, leftActions.length ? null : { paddingLeft: 20 }]}>
                        <Text style={styles.title}>{title}</Text>
                    </View>
                    { userStore.isResponder
                        ? <View style={styles.onDutyStatusContainer}>
                            <View style={[styles.onDutyStatusOutline, { borderColor: userStore.isOnDuty ? styles.onDuty.color : styles.offDuty.color }]}>
                                <Text style={[styles.onDutyStatusText, { color: userStore.isOnDuty ? styles.onDuty.color : styles.offDuty.color }]}>{userStore.isOnDuty ? 'READY': 'OFF-DUTY'}</Text>
                            </View>
                        </View>
                        : null
                    }
                    <View style={styles.rightIconContainer}>
                        {
                            rightActions.map(a => <IconButton key={a.icon} style={styles.icon} icon={a.icon} size={iconSize} color='#fff' onPress={a.callback}/>)
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
                    <IconButton icon='close' size={iconSize} color='#fff' onPress={closeHeader}/>
                </View>
                <View style={styles.onDutySwitchContainer}>
                    <Text style={[styles.onDutyText, userStore.isOnDuty ? {} : styles.offDutyText]}>{userStore.isOnDuty ? 'Ready to go' : 'Off duty'}</Text>
                    <Switch
                        value={userStore.isOnDuty} 
                        disabled={!userStore.isResponder}
                        onValueChange={() => userStore.toggleOnDuty()} 
                        color='#32D74B'/>
                </View>
            </View>
            <View style={styles.fullScreenContent}>
                { mainMenuOptions() }
                { subMenuOptions() }
            </View>
        </View>

    return headerStore.isOpen
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
        backgroundColor: '#000',
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
        color: '#fff',
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
        color: '#17BA45',
    },
    offDuty: {
        color: '#999',
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
        backgroundColor: `#000`,
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
        color: '#fff',
        fontSize: 18,
        marginRight: 12,
        fontWeight: 'bold'
    },
    offDutyText: {
        color: '#ccc',
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
        borderTopColor: '#666',
        borderWidth: 1,
        marginVertical: 10
    },
    subMenuOptions: {
        borderTopColor: '#666',
        borderTopWidth: 1,
        paddingVertical: 10,
    },
    mainMenuText: {
        color: '#fff',
        marginVertical: 10,
        fontSize: 24, 
        fontWeight: 'bold'
    },
    disabledMainMenuText: {
        color: '#aaa'
    },
    subMenuText: {
        color: '#fff',
        marginVertical: 10,
        fontSize: 18
    },
    disabledSubMenuText: {
        color: '#aaa'
    }
});