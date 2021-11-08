import React, { ClassType, Component, ComponentType, FunctionComponent, useCallback, useEffect, useState } from "react";
import { ScreenProps, routerNames } from "../types";
import { Modal, Portal, Button, Text, List, TextInput, IconButton } from 'react-native-paper';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { HelpRequest, RequestSkill, RequestSkillCategory, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import { CreateReqData, ICreateRequestStore, ILocationStore, IRequestStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { useRef } from "react";
import { useKeyboard } from "../hooks/useKeyboard";
import { Icon } from "react-native-paper/lib/typescript/components/Avatar/Avatar";
import MapView, { MapEvent, Marker, Point, PROVIDER_GOOGLE } from 'react-native-maps';
import { HeaderHeight } from "../components/header/header";
import { navigateTo, navigationRef } from "../navigation";
import { observer } from "mobx-react-lite";
import { IMapsService } from "../services/interfaces";
import { debounce } from "lodash";
import { getService } from "../services/meta";
import { GeocodeResult, LatLngLiteral, LatLngLiteralVerbose, Place, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import Tags from "../components/tags";
import { runInAction } from "mobx";

const windowDimensions = Dimensions.get("window");
const containerStyle = { backgroundColor: '#eee', height: windowDimensions.height };

const ResponderCountRange = [1, 2, 3, 4, 5];

type Props = ScreenProps<'CreateHelpRequest'>;

const CreateHelpRequest = observer(({ navigation, route }: Props) => {
    const [screenId, setScreenId] = useState(null);

    const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
    const locationStore = getStore<ILocationStore>(ILocationStore);
    
    useEffect(() => {
        locationStore.askForPermission().then(() => locationStore.getCurrentLocation())
    }, [])

    const openLink = (id: keyof CreateReqData) => {
        setScreenId(id);
    }

    const back = () => {
        setScreenId(null);
    }
    
    const listView = () => {

        const skillTags = () => {
            if (!createStore.skills || !createStore.skills.length) {
                return null
            }

            const deleteSkillTag = (idx: number) => {
                runInAction(() => {
                    createStore.skills.splice(idx, 1)
                })
            }

            return (
                <View style={[{ minHeight: 60 }]}>
                    <Tags 
                        verticalMargin={12} 
                        tags={createStore.skills.map(s => RequestSkillToLabelMap[s]) || []}
                        onTagDeleted={deleteSkillTag}/>
                </View>
            )
        }

        const typeTags = () => {
            if (!createStore.type || !createStore.type.length) {
                return null
            }

            const deleteTypeTag = (idx: number) => {
                runInAction(() => {
                    createStore.type.splice(idx, 1)
                })
            }

            return (
                <View style={[{ minHeight: 60 }]}>
                    <Tags 
                        dark 
                        verticalMargin={12} 
                        tags={createStore.type.map(t => RequestTypeToLabelMap[t]) || []}
                        onTagDeleted={deleteTypeTag}/>
                </View>
            )
        }

        return (
            <View style={containerStyle}>
                <CreateRequestHeader/>
                <View style={{
                    paddingLeft: 20,
                    borderStyle: 'solid',
                    borderBottomColor: '#ccc',
                    borderBottomWidth: 1,
                    height: 60,
                    justifyContent: 'center'
                }}>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                    }}>New Request</Text>
                </View>
                <Section openLink={openLink}  linkTo={'location'} label={createStore.location ? createStore.location.address : null}/>
                <Section 
                    openLink={openLink}  
                    linkTo={'type'} 
                    // label={createStore.type ? createStore.type.map(s => RequestTypeToLabelMap[s]).join(', ') : ''}
                    labelComponent={typeTags()}/>
                <Section openLink={openLink}  linkTo={'notes'} label={createStore.notes ? createStore.notes : ''}/>
                <Section 
                    openLink={openLink}  
                    linkTo={'skills'} 
                    // label={createStore.skills ? createStore.skills.map(s => RequestSkillToLabelMap[s]).join(', ') : ''}
                    labelComponent={skillTags()}/>
                <Section openLink={openLink}  linkTo={'respondersNeeded'} label={createStore.respondersNeeded ? createStore.respondersNeeded.toString() : null}/>
            </View>
        )
    }

    const Component: ComponentType<SectionScreenProps> = screenId 
        ? CreateRequestScreenMap[screenId]
        : null;

    return (
        Component
            ? <Component back={back} store={createStore} screenId={screenId}/>
            : listView()
    )
})

export default CreateHelpRequest

const SectionTitleLabelMap: {
    [ key in keyof CreateReqData]: string
} = {
    location: 'Location', 
    type: 'Type of request', 
    notes: 'Notes', 
    skills: 'Skills required', 
    respondersNeeded: 'Responders needed', 
}

function Section(props: { 
    linkTo: keyof CreateReqData,
    openLink: (screenId: keyof CreateReqData) => void,
    labelComponent?: JSX.Element,
    label?: string
}) {

    const expand = () => {
        props.openLink(props.linkTo);
    }

    return props.labelComponent 
        ? <View style={[styles.section]}>
            <View style={{ flex: 1 }}>{props.labelComponent}</View>
            <IconButton
                    style={{ flex: 0, height: 30, width: 30 }}
                    icon='chevron-right' 
                    color='rgba(60,60,67,.3)'
                    onPress={expand}
                    size={30} />
        </View>
        : props.label 
            ? <View style={styles.section} onTouchStart={expand}>
                <Text style={[styles.label, { flex: 1 }]}>{props.label}</Text>
                <IconButton
                    style={{ flex: 0, height: 30, width: 30, marginLeft: 20 }}
                    icon='chevron-right' 
                    color='rgba(60,60,67,.3)'
                    onPress={expand}
                    size={30} />
            </View>
            : <View style={styles.section} onTouchStart={expand}>
                <Text style={styles.placeholder}>{SectionTitleLabelMap[props.linkTo]}</Text>
                <IconButton
                    style={{ flex: 0, height: 30, width: 30 }}
                    icon='chevron-right' 
                    color='rgba(60,60,67,.3)'
                    onPress={expand}
                    size={30} />
            </View>
}

type SectionScreenProps = {
    back: () => void,
    store: ICreateRequestStore,
    screenId: keyof CreateReqData
}

const CreateRequestHeader = () => {
    const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
    const requestStore = getStore<IRequestStore>(IRequestStore);

    const cancel = () => {
        createStore.clear()

        // TODO: close bottom drawer
        navigationRef.current?.goBack()
    }

    const create = async () => {
        await createStore.createRequest();

        await requestStore.getRequests();
        navigateTo(routerNames.helpRequestList);
    }

    return <View style={styles.createRequestHeader}>
        <IconButton
            icon='close' 
            color='#000'
            onPress={cancel}
            size={30} />
        <Button 
            color='#fff'
            onPress={create}
            style={styles.headerCreateButton}>add</Button>
    </View>
}

const BackButtonHeader = ({ back, save, screenId }: { back: () => void, save: () => void, screenId: string }) => {
    return <View style={styles.backButtonHeader}>
        <IconButton
            icon='chevron-left' 
            color='#000'
            onPress={back}
            size={35} 
            style={{ margin: 0, width: 35 }}/>
        <Text style={{ flex: 1, fontSize: 18 }} onPress={back}>{SectionTitleLabelMap[screenId]}</Text>
        <Button 
            color='orange'
            onPress={save}
            style={styles.headerSaveButton}>save</Button>
    </View>
}

const Suggestion = ({ suggestion, onPress }: { suggestion: PlaceAutocompleteResult, onPress: () => void }) => {
    return (
        <View style={{
            marginBottom: 16,
            paddingHorizontal: 16
        }} onTouchStart={onPress}>
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

const CreateRequestScreenMap: { [key in keyof CreateReqData]: ComponentType<SectionScreenProps> } = {
    'location': observer(({ back, store }: SectionScreenProps) => {
        const locationStore = getStore<ILocationStore>(ILocationStore);
        const mapsService = getService<IMapsService>(IMapsService);

        const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([]);
        const [chosenSuggestion, setChosenSuggestion] = useState<PlaceAutocompleteResult>(null);
        const [searchText, setSearchText] = useState('');
        const [targetCoords, setTargetCoords] = useState<LatLngLiteral>(null);
        const [inputActive, setInputActive] = useState(false);
        const [inManualMode, setInManualMode] = useState(false);
        const [manuallyChosenLocation, setManuallyChosenLocation] = useState<GeocodeResult>(null);

        const mapInstance = useRef<MapView>();

        // react native papers types are broken here
        const textInputInstance = useRef<RNTextInput>();
        
        const initialRegion = locationStore.lastKnownLocation
            ? {
                latitude: locationStore.lastKnownLocation.coords.latitude,
                longitude: locationStore.lastKnownLocation.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            } : undefined

        const isSaveable = (inManualMode && manuallyChosenLocation) || (!inManualMode && chosenSuggestion);

        const updateSuggestions = useCallback(debounce(async (address: string) => {
            const options = await mapsService.autoCompleteSearch(address)
            setSuggestions(options.slice(0, 3));
        }, 500), [])

        const onTextUpdated = (text: string) => {
            updateSuggestions(text);
            setSearchText(text)
            setInManualMode(false);
            setManuallyChosenLocation(null)
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
            const coords = event.nativeEvent.coordinate;

            if (inManualMode) {
                await manuallySetLocation(coords)
            } else {
                Keyboard.dismiss();
            }
        }

        const clear = () => {
            setSearchText('')
            setSuggestions([])
            setChosenSuggestion(null)
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

        const chooseLocationOnMap = () => {
            setInManualMode(true)
            setInputActive(false)
            setChosenSuggestion(null)
            Keyboard.dismiss()
        }

        const save = () => {
            if (isSaveable) {
                store.location = {
                    latitude: targetCoords.lat,
                    longitude: targetCoords.lng,
                    address: inManualMode ? manuallyChosenLocation.formatted_address : chosenSuggestion.description
                }

                back()
            }
        }


        return (
            <>
                <MapView 
                    provider={PROVIDER_GOOGLE} 
                    showsUserLocation={true}
                    initialRegion={initialRegion}
                    onPress={mapPressed}
                    ref={mapInstance}
                    style={{ height: windowDimensions.height - HeaderHeight }}>
                        { targetCoords 
                            ? <Marker
                                coordinate={{ latitude: targetCoords.lat, longitude: targetCoords.lng }}
                                title={inManualMode ? undefined : chosenSuggestion.structured_formatting.main_text}
                                description={inManualMode ? undefined : chosenSuggestion.structured_formatting.secondary_text}
                                draggable={inManualMode}
                                onDragEnd={(e) => manuallySetLocation(e.nativeEvent.coordinate)}
                            />
                            : null }
                </MapView>
                <View style={{ 
                    position: 'relative',
                    top: -windowDimensions.height + HeaderHeight
                }}>
                        <View style={{ 
                            backgroundColor: '#fff', 
                            borderRadius: 24, 
                            height: 44, 
                            margin: 24, 
                            marginBottom: 0,
                            flexDirection: 'row',
                            alignContent: 'center'
                        }}>
                            <IconButton
                                style={{ alignSelf: 'center', margin: 0 , width: 35}}
                                icon='chevron-left' 
                                color='#000'
                                onPress={back}
                                size={35} />
                            <RNTextInput 
                                onChangeText={onTextUpdated}
                                value={searchText}
                                onFocus={textInputFocused}
                                onBlur={textInputBlurred}
                                ref={textInputInstance}
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: '#fff', 
                                    height: 44, 
                                    paddingHorizontal: 0, 
                                    borderBottomWidth: 0,
                                    fontSize: 16
                                }}/>
                            <IconButton
                                style={{ alignSelf: 'center', margin: 0 , marginRight: 12, width: 25}}
                                icon='close' 
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
                                {suggestions.map(s => {
                                    return <Suggestion suggestion={s} onPress={() => chooseSuggestion(s)}/>
                                })}
                                <View style={{
                                    // marginBottom: 16,
                                    borderTopColor: '#999',
                                    borderTopWidth: 1,
                                    flexDirection: 'row'
                                }}>
                                    <IconButton
                                        style={{ alignSelf: 'center', width: 25}}
                                        icon='map-marker' 
                                        color={'#999'}
                                        size={25} />
                                    <Text 
                                        onPress={chooseLocationOnMap}
                                        style={{
                                            fontSize: 16,
                                            alignSelf: 'center'
                                    }}>Pick location on map</Text>
                                </View>
                            </View>
                            : null }
                </View>

                <View 
                    onTouchStart={save}
                    style={{
                        backgroundColor: '#000', 
                        borderRadius: 24, 
                        height: 44, 
                        margin: 24,
                        position: 'absolute',
                        bottom: 0,
                        width: windowDimensions.width - (2 * 24),
                        justifyContent: 'center'
                }}>
                    <Text style={{ 
                        alignSelf: 'center', 
                        color: isSaveable ? '#fff' : '#999'
                    }}>Save this location</Text>
                </View>
            </>
        )
    }),
    'type': ({ back, store, screenId }: SectionScreenProps) => {
        const [types, setTypes] = useState(new Set(store.type));

        const save = () => {
            store.type = Array.from(types.values());
            back();
        }

        const toggleType = (typ: RequestType) => {
            const cpy = new Set(types)
            
            if (cpy.has(typ)) {
                cpy.delete(typ);
            } else {
                cpy.add(typ)
            }

            setTypes(cpy);
        }

        return (
            <>
                <BackButtonHeader  back={back} save={save} screenId={screenId} />
                <List.Section style={{margin: 0}}>
                    {allEnumValues(RequestType).map(typ => {
                        const chosen = types.has(typ);

                        return <List.Item 
                                    key={typ} 
                                    onPress={() => toggleType(typ)} 
                                    title={RequestTypeToLabelMap[typ]}
                                    titleStyle={chosen ? styles.chosenItem : styles.noop}
                                    style={styles.item}
                                    right={chosen ? props => <List.Icon color={'#000'} icon={'check'} style={styles.rightCheckIcon}/> : null}/>
                    })}
                </List.Section>
            </>
        )
    },
    'notes': ({ back, store, screenId }: SectionScreenProps) => {
        const [notes, setNotes] = useState(store.notes);

        const save = () => {
            store.notes = notes;
            back();
        }

        const screenHeight = Dimensions.get('screen');
        const keyboardHeight = useKeyboard()

        const targetHeight = screenHeight.height - HeaderHeight - keyboardHeight;


        return (
            <KeyboardAvoidingView
                behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
                style={styles.notesContainer}>
                <View style={{ height: targetHeight }}>
                    <BackButtonHeader  back={back} save={save} screenId={screenId} />
                    <View style={styles.notes}>
                        <RNTextInput 
                            style={{ lineHeight: styles.label.lineHeight, fontSize: styles.label.fontSize }}
                            multiline
                            autoFocus
                            value={notes}
                            onChangeText={(s: string) => setNotes(s)}/>
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }, 
    'skills': ({ back, store, screenId }: SectionScreenProps) => {
        const categories = Object.keys(RequestSkillCategoryMap);

        const [skills, setSkills] = useState(new Set(store.skills));

        const save = () => {
            store.skills = Array.from(skills.values());
            back();
        }

        const toggleSkill = (skill: RequestSkill) => {
            const cpy = new Set(skills)
            
            if (cpy.has(skill)) {
                cpy.delete(skill);
            } else {
                cpy.add(skill)
            }

            setSkills(cpy);
        }

        return (
            <>
                <BackButtonHeader  back={back} save={save} screenId={screenId} />
                <List.Section>
                    {categories.map((cat: RequestSkillCategory) => {

                        const items = Array.from(RequestSkillCategoryMap[cat].values())
                                        .map(skill => {
                                            const chosen = skills.has(skill);
                                            return <List.Item 
                                                        key={skill} 
                                                        onPress={() => toggleSkill(skill)} 
                                                        title={RequestSkillToLabelMap[skill]}
                                                        titleStyle={chosen ? styles.chosenItem : styles.noop}
                                                        style={styles.item}
                                                        right={chosen ? props => <List.Icon color={'#000'} icon={'check'} style={styles.rightCheckIcon}/> : null}/>
                                        })

                        return [   
                            <List.Subheader key='subheader' style={styles.item}>{RequestSkillCategoryToLabelMap[cat]}</List.Subheader>,
                            ...items
                        ]
                    })}
                </List.Section>
            </>
        )
    },
    'respondersNeeded': ({ back, store, screenId }: SectionScreenProps) => {
        const [numResponders, setNumResponders] = useState(store.respondersNeeded);

        const save = () => {
            store.respondersNeeded = numResponders;
            back();
        }
        
        return (
            <>
                <BackButtonHeader  back={back} save={save} screenId={screenId} />
                <List.Section>
                    {ResponderCountRange.map(num => {
                        const chosen = num == numResponders;

                        return <List.Item 
                                    key={num} 
                                    onPress={() => setNumResponders(num)} 
                                    title={num} 
                                    titleStyle={chosen ? styles.chosenItem : styles.noop}
                                    style={styles.item}
                                    right={chosen ? props => <List.Icon color={'#000'} icon={'check'} style={styles.rightCheckIcon}/> : null}></List.Item>
                    })}
                </List.Section>
            </>
        )
    }
}

const styles = StyleSheet.create({
    section: {
      minHeight: 60,
      borderStyle: 'solid',
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      width: '100%',
      paddingLeft: 20,
    //   paddingRight: 20,
      justifyContent: 'space-between'
    }, 
    placeholder: {
        color: '#aaa'
    },
    label: {
        color: '#000',
        maxHeight: 120,
        paddingVertical: 12,
        lineHeight: 24,
        fontSize: 18
    },
    backButtonHeader: {
        // height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: 0,
        // marginBottom: ,
        // borderBottomWidth: 1,
        // borderBottomColor: '#000',

        // textAlign: 'center',
        // textAlignVertical: 'center'
        
    },
    headerSaveButton: {
        // height: 40,
        // borderRadius: 10,
        // backgroundColor: 'orange',
        // color: 'orange'
    },
    headerBackButton: {
        // height: 40
    },
    notes: {
        flex: 1,
        padding: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    }, 
    notesContainer: {
        flex: 1
    },
    item: {
        paddingLeft: 30
    },
    chosenItem: {
        fontWeight: 'bold'
    }, 
    noop: {
        
    }, 
    rightCheckIcon: {
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        height: 20
    },
    createRequestHeader: {
        // height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerCreateButton: {
        backgroundColor: 'orange',
        marginRight: 20,
        borderRadius: 20
    }
})


// function CreateRequestWizard() {
//     const [currentWizardScreen, setCurrentWizardScreen] = useState<>()
// }