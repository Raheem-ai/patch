import * as React from 'react';
import { Dimensions, View } from 'react-native';
import { StackHeaderProps } from '@react-navigation/stack';
import { StyleSheet } from "react-native";
import { IconButton, Switch, Text } from 'react-native-paper';
import { useState } from 'react';
import { MainMenuOption, MainMenuOptions, navigateTo, SubMenuOptions } from '../../navigation';
import { routerNames } from '../../types';
import { getStore } from '../../stores/meta';
import { observer } from 'mobx-react';
import HeaderConfig, { HeaderRouteConfig } from './headerConfig';
import { IUserStore } from '../../stores/interfaces';

type Props = StackHeaderProps & {};

const Header = observer((props: Props) => {

    const userStore = getStore<IUserStore>(IUserStore);

    const dimensions = Dimensions.get('window');
    const config: HeaderRouteConfig = HeaderConfig[props.route.name];
    
    const title = typeof config.title == 'string'
        ? config.title
        : config.title();

    const [isOpen, setIsOpen] = useState(false);

    // TODO: get this from stores at some point
    const dynamicContentToDisplay = false;

    const openHeader = () => {
        setIsOpen(true)
    }

    const closeHeader = () => setIsOpen(false)

    const headerBar = () => {
        const leftActions = config.leftActions && config.leftActions.length
            ? config.leftActions
            : [{ icon: 'menu', callback: openHeader }]

        const rightActions = config.rightActions && config.rightActions.length
            ? config.rightActions
            : []

        return (
            <View style={styles.container}>
                <View style={styles.leftIconContainer}>
                    {
                        leftActions.map(a => <IconButton key={a.icon} icon={a.icon} size={iconSize} color='#fff' onPress={a.callback}/>)
                    }
                </View>
                <View style={styles.titleContainer}>
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
        )
    }

    const dynamicContent = () => {
        if (dynamicContentToDisplay) {
            return <View style={styles.dynamicContent}>

            </View>
        } else {
            return null
        }
    }

    const mainMenuOptions = () => {
        const style = {
            ...styles.mainMenuOptions,
            ...(!dynamicContentToDisplay ? styles.noDynamicContent : {})
        }

        const onPress = (opt: MainMenuOption) => {
            return () => {
                navigateTo(routerNames[opt.routeTo])
                closeHeader()
            }
        }

        return (
            <View style={style}>
                {MainMenuOptions.map(opt => <Text key={opt.name} style={styles.mainMenuText} onPress={onPress(opt)}>{opt.name}</Text>)}
            </View>
        )
    }

    const subMenuOptions = () => {
        return (
            <View style={styles.subMenuOptions}>
                {SubMenuOptions.map(opt => <Text key={opt.name} style={styles.subMenuText} onPress={() => {
                    if (opt.routeTo) {
                        navigateTo(routerNames[opt.routeTo])
                    } else if (opt.onPress) {
                        opt.onPress()
                    }

                    closeHeader()
                }}>{opt.name}</Text>)}
            </View>
        )
    }
    
    const fullScreenHeader = () =>
        <View style={{ ...styles.fullScreenContainer, ...{ height: dimensions.height }}}>
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
                { dynamicContent() }
                { subMenuOptions() }
            </View>
        </View>

    return isOpen
        ? fullScreenHeader()
        : headerBar()
})

export default Header;
export const HeaderHeight = 90;

const windowDimensions = Dimensions.get("window"); // this should probably be more dynamic  
const iconSize = 30;
const iconPadding = 12;
const iconContainerSize = (2 * iconPadding) + iconSize;
const interactiveHeaderHeight = iconContainerSize;

const styles = StyleSheet.create({
    // CLOSED
    container: {
        height: HeaderHeight,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    leftIconContainer: {
        width: iconContainerSize,
        height: interactiveHeaderHeight
    },
    titleContainer: {
        flex: 1,
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: interactiveHeaderHeight
    },
    title: {
        color: '#fff',
        fontSize: 20
    },
    onDutyStatusContainer: {
        alignItems: 'flex-start', 
        justifyContent: 'center',
        height: interactiveHeaderHeight,
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
        height: interactiveHeaderHeight
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
        height: interactiveHeaderHeight,
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
    subMenuText: {
        color: '#fff',
        marginVertical: 10,
        fontSize: 18
    }
});