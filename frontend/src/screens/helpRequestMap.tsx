import { observer } from "mobx-react";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, GestureResponderEvent, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { IconButton } from "react-native-paper";
import { HeaderHeight } from "../components/header/header";
import HelpRequestCard from "../components/helpRequestCard";
import { ActiveRequestTabHeight } from "../constants";
import { BottomDrawerHandleHeight, IBottomDrawerStore, ILocationStore, IRequestStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { ScreenProps, routerNames } from "../types";

type Props = ScreenProps<'HelpRequestMap'>;

const windowDimensions = Dimensions.get("screen");

export const HelpRequestMap = observer(({ navigation, route }: Props) => {
    const locationStore = getStore<ILocationStore>(ILocationStore);
    const requestStore = getStore<IRequestStore>(IRequestStore);
    const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    const [startTouchX, setStartTouchX] = useState(null);
    const [deltaTouchX, setDeltaTouchX] = useState(0);
    const [idx, setIdx] = useState(1);
    const [visualDeltaX, setVisualDeltaX ] = useState(0);

    const mapInstance = useRef<MapView>();

    
    useEffect(() => {
        locationStore.askForPermission().then(() => locationStore.getCurrentLocation())
    }, [])

    useEffect(() => {
        if (!requestStore.requests.length) {
            return
        }

        const req = requestStore.requests[idx - 1];

        setTimeout(() => {
            mapInstance.current.animateCamera({ center: {
                latitude: req.location.latitude,
                longitude: req.location.longitude
            }})
        }, 100)

    }, [idx])

    const initialRegion = locationStore.lastKnownLocation
            ? {
                latitude: locationStore.lastKnownLocation.coords.latitude,
                longitude: locationStore.lastKnownLocation.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            } : undefined

    const onTouchMove = (event: GestureResponderEvent) => {
        setDeltaTouchX(event.nativeEvent.pageX - startTouchX)
    }

    const onTouchStart = (event: GestureResponderEvent) => {
        setStartTouchX(event.nativeEvent.pageX);
    }

    const onTouchEnd = (event: GestureResponderEvent) => {
        const delta = event.nativeEvent.pageX - startTouchX;

        if (Math.abs(delta) >= ((1/3) * windowDimensions.width)) {
            if (delta < 0) {
                if (idx == requestStore.requests.length) {
                    setDeltaTouchX(0);
                    return
                }

                // go right
                setVisualDeltaX(visualDeltaX - windowDimensions.width)
                setDeltaTouchX(0)
                setIdx(idx + 1);
            } else {
                if (idx == 1) {
                    setDeltaTouchX(0)
                    return;
                }

                // go left
                setVisualDeltaX(visualDeltaX + windowDimensions.width)
                setDeltaTouchX(0)
                setIdx(idx - 1)
            }
        } else {
            setDeltaTouchX(0)
        }
    }

    const swipeStyle = {
        left: visualDeltaX + deltaTouchX 
    }

    const bottomUIOffset = bottomDrawerStore.showing
        ? BottomDrawerHandleHeight 
        : 0; 

    const height = windowDimensions.height - HeaderHeight - bottomUIOffset;

    const goToActiveRequest = () => {
        const activeIdx = requestStore.requests.findIndex(r => r.id == requestStore.activeRequest?.id);

        if (activeIdx != -1) {
            setIdx(activeIdx + 1)
            setVisualDeltaX((activeIdx) * windowDimensions.width)
            setDeltaTouchX(0)
        }
    }

    return (
        <>
            <MapView 
                ref={mapInstance}
                provider={PROVIDER_GOOGLE} 
                showsUserLocation={true}
                initialRegion={initialRegion}
                style={{ height: height }}>
                    { requestStore.requests.length 
                            ? <Marker
                                coordinate={{ 
                                    latitude: requestStore.requests[idx - 1].location.latitude, 
                                    longitude: requestStore.requests[idx - 1].location.longitude }} />
                            : null }
            </MapView>
            <View style={[styles.bottomOverlay, bottomUIOffset ? { bottom: styles.bottomOverlay.bottom + bottomUIOffset } : null ]}>
                { !!requestStore?.activeRequest?.id && requestStore.activeRequest.id != requestStore.requests?.[idx - 1]?.id
                    ? <View style={styles.returnIconContainer} onTouchStart={goToActiveRequest}>
                        <IconButton
                            style={styles.returnIcon}
                            icon={'keyboard-return'}
                            color={styles.returnIcon.color}
                            size={styles.returnIcon.width}/>
                    </View>
                    : null
                }
                <View 
                    style={[styles.cardTrack, swipeStyle]} 
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}>
                    {
                        requestStore.requests.map(r => {
                            return (
                                <View key={r.id} style={styles.cardContainer}>
                                    <HelpRequestCard request={r} style={styles.card} dark={requestStore.activeRequest?.id == r.id}/>
                                </View>
                            )
                        })
                    }
                </View>
            </View>
        </>
    )

})

export default HelpRequestMap;

const styles = StyleSheet.create({
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
    },
    cardTrack: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    cardContainer: {
        width: windowDimensions.width - (2 * 20),
        margin: 20
    },
    card: {
        borderRadius: 8,
        borderBottomWidth: 0
    },
    returnIconContainer: {
        backgroundColor: '#444144',
        height: 64,
        width: 64,
        borderRadius: 64,
        justifyContent: 'center',
        position: 'relative',
        right: 20 + 64 - windowDimensions.width
    },
    returnIcon: {
        color: '#fff',
        height: 30,
        width: 30,
        margin: 0,
        alignSelf: 'center'
    }
})