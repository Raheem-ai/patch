import { observer } from "mobx-react";
import React, { useCallback, useRef, useState } from "react";
import { Dimensions, View, TextInput as RNTextInput, StyleSheet, Keyboard, Pressable } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { IMapsService } from "../../../../services/interfaces";
import { getService } from "../../../../services/meta";
import { locationStore, nativeEventStore } from "../../../../stores/interfaces";
import { SectionScreenViewProps } from "../../types";
import { GeocodeResult, LatLngLiteral, LatLngLiteralVerbose, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import MapView, { MapEvent, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { debounce } from "lodash";
import { AddressableLocation } from "../../../../../../common/models";
import KeyboardAwareArea from "../../../helpers/keyboardAwareArea";
import { ICONS } from "../../../../types";
import TestIds from "../../../../test/ids";

const MapInput = observer(({ back, config }: SectionScreenViewProps<'Map'>) => {
    const wrappedTestID = TestIds.inputs.mapInput.wrapper(config.testID)

    const mapsService = getService<IMapsService>(IMapsService);

    const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
    const [chosenSuggestion, setChosenSuggestion] = useState<PlaceAutocompleteResult>(null);
    const [searchText, setSearchText] = useState('');
    const [targetCoords, setTargetCoords] = useState<LatLngLiteral>(null);
    const [inputActive, setInputActive] = useState(false);
    const [manuallyChosenLocation, setManuallyChosenLocation] = useState<GeocodeResult>(null);

    const mapInstance = useRef<MapView>();

    // react native papers types are broken here
    const textInputInstance = useRef<RNTextInput>();
    
    const initialRegion = locationStore().lastKnownLocation
        ? {
            latitude: locationStore().lastKnownLocation.coords.latitude,
            longitude: locationStore().lastKnownLocation.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        } : undefined

    const isSaveable = manuallyChosenLocation || chosenSuggestion;

    const dimensions = Dimensions.get("screen");

    const updateSuggestions = useCallback(debounce(async (address: string) => {
        const options = await mapsService.autoCompleteSearch(address)
        setSuggestions(options.slice(0, 3));
    }, 500), [])

    const onTextUpdated = (text: string) => {
        updateSuggestions(text);
        setSearchText(text);
        setManuallyChosenLocation(null);
    }

    const manuallySetLocation = async (coords: LatLngLiteralVerbose) => {
        textInputInstance.current.blur();

        setTargetCoords({
            lat: coords.latitude,
            lng: coords.longitude
        })

        setTimeout(() => {
            mapInstance.current.animateCamera({ center: {
                latitude: coords.latitude,
                longitude: coords.longitude
            }})
        }, 0)

        try {
            const place = await mapsService.latLongToPlace(coords.latitude, coords.longitude);
            setSearchText(place.formatted_address);
            setManuallyChosenLocation(place);

            setChosenSuggestion(null);
        } catch (e) {
            console.error(e)
        }
    }

    const mapPressed = async (event: MapEvent) => {
        await manuallySetLocation(event.nativeEvent.coordinate)
        Keyboard.dismiss();
    }

    const clear = () => {
        setSearchText('')
        setSuggestions([])
        setChosenSuggestion(null)
        setManuallyChosenLocation(null)
        setTargetCoords(null)
    }

    const chooseSuggestion = async (suggestion: PlaceAutocompleteResult) => {
        setChosenSuggestion(suggestion);
        setSearchText(suggestion.structured_formatting.main_text);
        setSuggestions([])

        Keyboard.dismiss();

        // lookup lat long of suggestion and pan there
        const coords = await mapsService.placeIdToLatLong(suggestion.place_id);

        setTargetCoords({
            lat: coords.lat,
            lng: coords.long
        })

        mapInstance.current.animateCamera({ center: {
            latitude: coords.lat,
            longitude: coords.long
        }})
    }

    const textInputFocused = () => {
        setInputActive(true)
    }

    const textInputBlurred = () => {
        setInputActive(false)
    }

    const save = async () => {
        if (isSaveable) {
            await nativeEventStore().hideKeyboard()
            
            const loc: AddressableLocation = {
                latitude: targetCoords.lat,
                longitude: targetCoords.lng,
                address: manuallyChosenLocation ? manuallyChosenLocation.formatted_address : chosenSuggestion.description
            }

            config.onSave?.(loc)

            back()
        }
    }

    const cancel = async () => {
        await nativeEventStore().hideKeyboard()
        config.onCancel?.()
        back()
    }

    return (
        <KeyboardAwareArea>
            <View style={{ flex: 1, position: 'relative'}}>
                <MapView 
                    testID={TestIds.inputs.mapInput.map(wrappedTestID)}
                    sentry-label={TestIds.inputs.mapInput.map(wrappedTestID)}
                    provider={PROVIDER_GOOGLE} 
                    showsUserLocation={true}
                    initialRegion={initialRegion}
                    onPress={mapPressed}
                    ref={mapInstance}
                    style={{ flex: 1 }}>
                        { targetCoords 
                            ? <Marker
                                testID={TestIds.inputs.mapInput.marker(wrappedTestID)}
                                sentry-label={TestIds.inputs.mapInput.marker(wrappedTestID)}
                                coordinate={{ latitude: targetCoords.lat, longitude: targetCoords.lng }}
                                title={chosenSuggestion ? chosenSuggestion.structured_formatting.main_text : undefined }
                                description={chosenSuggestion ?chosenSuggestion.structured_formatting.secondary_text : undefined}
                                draggable
                                onDragEnd={(e) => manuallySetLocation(e.nativeEvent.coordinate)}
                            />
                            : null }
                </MapView>
                <View style={{ 
                    position: 'absolute',
                    top: 0,
                    width: '100%'
                }}>
                        <View style={{ 
                            backgroundColor: '#fff', 
                            borderRadius: 24, 
                            height: 48, 
                            margin: 24, 
                            marginBottom: 0,
                            flexDirection: 'row',
                            alignContent: 'center',
                            flex: 1
                        }}>
                            <IconButton
                                testID={TestIds.inputs.mapInput.cancel(wrappedTestID)}
                                sentry-label={TestIds.inputs.mapInput.cancel(wrappedTestID)}
                                style={{ alignSelf: 'center', margin: 0 , width: 35}}
                                icon={ICONS.navBack} 
                                color='#000'
                                onPress={cancel}
                                size={35} />
                            <RNTextInput 
                                testID={TestIds.inputs.mapInput.searchText(wrappedTestID)}
                                sentry-label={TestIds.inputs.mapInput.searchText(wrappedTestID)}
                                onChangeText={onTextUpdated}
                                value={searchText}
                                onFocus={textInputFocused}
                                onBlur={textInputBlurred}
                                ref={textInputInstance}
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: '#fff', 
                                    height: 48, 
                                    paddingHorizontal: 0, 
                                    borderBottomWidth: 0,
                                    fontSize: 16
                                }}/>
                            <IconButton
                                testID={TestIds.inputs.mapInput.clearText(wrappedTestID)}
                                sentry-label={TestIds.inputs.mapInput.clearText(wrappedTestID)}
                                style={{ alignSelf: 'center', margin: 0 , marginRight: 12, width: 25}}
                                icon={ICONS.textInputClear} 
                                color={searchText ? '#666' : '#fff'}
                                onPress={clear}
                                size={25} />
                        </View>
                        { inputActive
                            ? <View style={{ 
                                backgroundColor: '#fff', 
                                borderBottomLeftRadius: 24, 
                                borderBottomRightRadius: 24, 
                                marginHorizontal: 24, 
                                alignContent: 'center', 
                                paddingTop: suggestions.length ? 22 + 16 : 22,
                                position: 'relative',
                                top: -22,
                                zIndex: -1                                
                            }}>
                                {suggestions.map((s, idx) => {
                                    return (
                                        <Suggestion 
                                            testID={TestIds.inputs.mapInput.suggestionN(wrappedTestID, idx)}
                                            sentry-label={TestIds.inputs.mapInput.suggestionN(wrappedTestID, idx)}
                                            suggestion={s} 
                                            onPress={() => chooseSuggestion(s)}/>
                                    )
                                })}
                            </View>
                            : null }
                </View>
                <Pressable 
                    testID={TestIds.inputs.mapInput.save(wrappedTestID)}
                    sentry-label={TestIds.inputs.mapInput.save(wrappedTestID)}
                    onPress={save}
                    style={{
                        backgroundColor: '#000', 
                        borderRadius: 24, 
                        height: 48, 
                        margin: 24,
                        position: 'absolute',
                        bottom: 0,
                        width: dimensions.width - (2 * 24),
                        justifyContent: 'center'
                }}>
                    <Text style={{ 
                        alignSelf: 'center', 
                        color: isSaveable ? '#fff' : '#999',
                        fontWeight: '700'
                    }}>Save this location</Text>
                </Pressable>
            </View>
        </KeyboardAwareArea>
    )
})

export default MapInput;

const Suggestion = ({ suggestion, onPress, testID }: { suggestion: PlaceAutocompleteResult, onPress: () => void, testID: string }) => {
    return (
        <View style={{
            marginBottom: 16,
            paddingHorizontal: 16
        }} onTouchStart={onPress} testID={testID}>
            <Text style={{
                fontSize: 16
            }}>{suggestion.structured_formatting.main_text}</Text>
            <Text style={{
                fontSize: 12,
                color: '#666'
            }}>{suggestion.structured_formatting.secondary_text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    item: {
        paddingLeft: 30
    },
    chosenItem: {
        fontWeight: 'bold'
    }, 
    noop: {
        // flexWrap: 'wrap'
    }, 
    rightCheckIcon: {
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        height: 20
    },
})