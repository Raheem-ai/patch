import React, { ComponentType, useCallback, useState } from "react";
import { Button, Text, List, IconButton } from 'react-native-paper';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { useRef } from "react";
import { observer } from "mobx-react";
import { debounce } from "lodash";
import { GeocodeResult, LatLngLiteral, LatLngLiteralVerbose, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import Tags from "../../components/tags";
import { computed, configure, observable, runInAction } from "mobx";
import { AddressableLocation } from "../../../../common/models";
import { FormInputConfig, FormInputViewMap, InlineFormInputViewConfig, ScreenFormInputViewConfig, SectionScreenViewProps, SectionInlineViewProps, ScreenFormInputConfig, InlineFormInputConfig, SectionLabelViewProps, CompoundFormInputConfig, StandAloneFormInputConfig } from "./types";
import TextAreaInput from "./inputs/textAreaInput";
import { sleep, unwrap } from "../../../../common/utils";
import TextInput from "./inputs/textInput";
import { Colors } from "../../types";
import ListInput from "./inputs/listInput";
import TagListLabel from "./inputs/tagListLabel";
import NestedListInput from "./inputs/nestedListInput";
import { INativeEventStore, nativeEventStore } from "../../stores/interfaces";
import { ScrollView } from "react-native-gesture-handler";
import { wrapScrollView } from "react-native-scroll-into-view";
import Loader from "../loader";
import MapInput from "./inputs/mapInput";
import DateTimeRangeInput from "./inputs/dateTimeRangeInput";
import RecurringTimePeriodInput from "./inputs/recurringTimePeriodInput";
import RecurringTimePeriodLabel from "./inputs/recurringTimePeriodLabel";
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack";
import { NavigationContainer, NavigationState } from "@react-navigation/native";

// const windowDimensions = Dimensions.get("screen");

const Stack = createStackNavigator();

type Grouped<T> = T | T[];

export type FormProps = {
    headerLabel: string,

    // TODO: change this to() FormInputConfig | FormInputConfig[])[] to allow for visually grouped components
    inputs: Grouped<FormInputConfig>[],
    onExpand?(): void,
    onBack?(): void,
    submit?: {
        label: string,
        handler: () => Promise<void>
    }
}

const FormViewMap: FormInputViewMap = {
    'TextArea': {
        screenComponent: TextAreaInput
    },
    'TextInput': {
        inlineComponent: TextInput
    }, 
    'List': {
        screenComponent: ListInput
    },
    'TagList': {
        screenComponent: ListInput,
        labelComponent: TagListLabel
    },
    'NestedList': {
        screenComponent: NestedListInput
    },
    'NestedTagList': {
        screenComponent: NestedListInput,
        labelComponent: TagListLabel
    },
    'Map': {
        screenComponent: MapInput
    },
    'DateTimeRange': {
        inlineComponent: DateTimeRangeInput
    },
    'RecurringTimePeriod': {
        screenComponent: RecurringTimePeriodInput,
        labelComponent: RecurringTimePeriodLabel
    }
}

const WrappedScrollView = wrapScrollView(ScrollView)

type GroupPosition = 'start' | 'middle' | 'end';

@observer
export default class Form extends React.Component<FormProps> {
    private homeScreenId = '__formHome';

    // used internally to know whether the form is submittable
    private isValid = computed<boolean>(() => {
        return this.inputs.get().filter(i => i.required).every(i => i.isValid());
    })

    // used to flatten the (visually grouped) inputs into an interable list of all
    // standalone inputs so they can be processed easily
    private inputs = computed<StandAloneFormInputConfig[]>(() => {
        return this.flattenGroupedInputConfigs(this.groupedInputs.get())
    })

    // used to unpack nested input configs from compound inputs (data based grouping) but keep them grouped
    // so they can be rendered correctly
    private groupedInputs = computed<Grouped<StandAloneFormInputConfig>[]>(() => {
        return this.expandCompoundInputConfigs(this.props.inputs)
    })

    private screenInputs = computed<ScreenFormInputConfig[]>(() => {
        return this.inputs.get().filter((config: ScreenFormInputConfig) => {
            // TODO: probably should actually have this be cheking the type against the known types 
            // but then we need those values somewhere...this works for now 
            return !!config.onSave
        }) as ScreenFormInputConfig[]
    })

    // use to externally signal that we are on the home screen of the form
    isHome = computed<boolean>(() => {
        return this.state.screenId == this.homeScreenId;
    })

    submitting = observable.box<boolean>(false)

    state = {
        screenId: this.homeScreenId
    }

    expandConfig = (config: FormInputConfig): StandAloneFormInputConfig[] => {

        const isCompoundInput = (config as any as CompoundFormInputConfig).inputs;

        if (isCompoundInput) {
            const nestedInputConfigs = (config as any as CompoundFormInputConfig).inputs?.()

            if (nestedInputConfigs && nestedInputConfigs.length) {
                const flattenedConfigs: StandAloneFormInputConfig[] = [];

                nestedInputConfigs.forEach(nestedConfig => {
                    flattenedConfigs.push(...this.expandConfig(nestedConfig))
                })

                return flattenedConfigs
            } else {
                return []
            }
        } else {
            return [
                config as StandAloneFormInputConfig
            ]
        }
    }

    expandCompoundInputConfigs = (inputConfigs: Grouped<FormInputConfig>[]): Grouped<StandAloneFormInputConfig>[] => {
        const expandedInputConfigs: Grouped<StandAloneFormInputConfig>[] = [];
        
        inputConfigs.forEach(config => {
            if (Array.isArray(config)) {
                const group: StandAloneFormInputConfig[] = []

                config.forEach(groupedConfig => {
                    group.push(...this.expandConfig(groupedConfig))
                });

                expandedInputConfigs.push(group);
            } else {
                const expandedConfig = this.expandConfig(config);
                expandedInputConfigs.push(...expandedConfig)
            }
        })

        return expandedInputConfigs
    }

    flattenGroupedInputConfigs = (inputConfigs: Grouped<StandAloneFormInputConfig>[]): StandAloneFormInputConfig[] => {
        const flattenedInputConfigs: StandAloneFormInputConfig[] = [];
        
        inputConfigs.forEach(config => {
            if (Array.isArray(config)) {
                flattenedInputConfigs.push(...config)
            } else {
                flattenedInputConfigs.push(config)
            }
        })

        return flattenedInputConfigs
    }
    
    listView = ({ navigation }: StackScreenProps<any>) => {

        const onPress = () => {
            if (nativeEventStore().keyboardOpen) {
                return Keyboard.dismiss()
            } 
        }

        const onSubmit = async () => {
            if (!this.isValid.get()) {
                return
            }

            this.submitting.set(true)

            try {
                await this.props.submit.handler()
            } finally {
                this.submitting.set(false)
            }
        }

        const navigateToScreen = (id: string) => {
            navigation.navigate(id);
            this.props.onExpand?.()
        }

        const renderInput = (inputConfig: StandAloneFormInputConfig, position?: GroupPosition) => {
            const viewConfig = FormViewMap[inputConfig.type];

            // make sure any inline store updates are being run in an action 
            // (for convenience)
            const inlineInputConfig = inputConfig as InlineFormInputConfig;

            if (inlineInputConfig.onChange) {
                const oldOnChange = inlineInputConfig.onChange;
                
                inlineInputConfig.onChange = (...args) => {
                    runInAction(() => {
                        return oldOnChange(...args)
                    })
                }
            }

            const screenInputConfig = inputConfig as ScreenFormInputConfig;

            const labelComponent = (viewConfig as ScreenFormInputViewConfig).labelComponent || null

            if (labelComponent) {
                return <LabelSection 
                    inputConfig={screenInputConfig}
                    labelComponent={labelComponent}
                    openLink={navigateToScreen}  
                    linkTo={inputConfig.name} 
                    groupPosition={position}/>
            }

            const inlineComponent = (viewConfig as InlineFormInputViewConfig).inlineComponent || null;

            if (inlineComponent) {    
                return <InlineSection 
                    inputConfig={inlineInputConfig}
                    inlineComponent={inlineComponent} 
                    groupPosition={position}/>
            }

            return <DefaultSection 
                inputConfig={screenInputConfig}
                openLink={navigateToScreen}  
                linkTo={inputConfig.name} 
                groupPosition={position}/>
        }

        const renderInputs = () => {
            const inputElements: JSX.Element[] = [];

            // for component groups, render each individual component section with a groupPosition prop to allow for visually grouped components
            // ie LabelSection, InlineSection, DefaultSection need a new prop like groupPosition?: 'start' | 'middle' | 'end'
            this.groupedInputs.get().forEach(inputConfig => {
                if (Array.isArray(inputConfig)) {

                    if (inputConfig.length == 1) {
                        inputElements.push(renderInput(inputConfig[0]));
                        return;
                    }

                    inputConfig.forEach((config, i) => {
                        const position: GroupPosition = i == 0
                            ? 'start'
                            : i == inputConfig.length - 1
                                ? 'end'
                                : 'middle'

                        inputElements.push(renderInput(config, position))
                    })
                } else {
                    inputElements.push(renderInput(inputConfig))
                }
            })

            return inputElements;
        }

        return (
                <WrappedScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <Pressable onPress={onPress} style={{ flex: 1, paddingBottom: 20 }}>
                        <View style={{
                            paddingLeft: 20,
                            borderStyle: 'solid',
                            borderBottomColor: '#ccc',
                            borderBottomWidth: 1,
                            minHeight: 60,
                            justifyContent: 'center',
                            padding: 20
                        }}>
                            <Text style={{
                                fontSize: 24,
                                fontWeight: 'bold',
                            }}>{this.props.headerLabel}</Text>
                        </View>
                        { renderInputs() }
                        {
                            this.props.submit
                                ? <Button 
                                    uppercase={false}
                                    onPress={onSubmit}
                                    color={this.isValid.get() ? styles.submitButton.color : styles.disabledSubmitButton.color}
                                    icon='account-plus'
                                    disabled={!this.isValid.get()} 
                                    style={[styles.submitButton, !this.isValid.get() ? styles.disabledSubmitButton : null ]}>{this.props.submit.label}</Button>
                                : null
                        }
                    </Pressable>
                </WrappedScrollView>
        )
    }

    inputScreen = (inputConfig: ScreenFormInputConfig) => ({ navigation }: StackScreenProps<any>) => {
        const viewConfig = FormViewMap[inputConfig.type];

        const ScreenComponent: ComponentType<SectionScreenViewProps> = (viewConfig as ScreenFormInputViewConfig).screenComponent;
        
        if (ScreenComponent) {
            if (inputConfig.onSave) {
                const oldOnSave = inputConfig.onSave;
                
                inputConfig.onSave = (...args) => {
                    runInAction(() => {
                        return oldOnSave(...args)
                    })
                }
            }

            const back = () => {
                navigation.goBack()
                this.props.onBack?.()
            }

            return <ScreenComponent back={back} config={inputConfig}/>
        }
    }

    saveRoute = (state: NavigationState) => {
        const routeName = state?.routes[state?.index]?.name;

        this.setState({
            screenId: routeName
        })
    }

    render() {
        return (
            <NavigationContainer independent onStateChange={this.saveRoute}>
                <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#fff' }}}  initialRouteName={this.homeScreenId}>
                    <Stack.Screen name={this.homeScreenId} component={this.listView} />
                    {
                        this.screenInputs.get().map(screenInputConfig => {
                            return (
                                <Stack.Screen name={screenInputConfig.name} component={this.inputScreen(screenInputConfig)}/>
                            )
                        })
                    }
                </Stack.Navigator>
            </NavigationContainer>
        )
    }
}

/**
 * Needs:
 * - to be able to visually group sets of inputs
 * - to be able to specify the icon for a group of inputs/any of the inline/label components 
 *   from the config
 * - allow an input type that has a label component and navigates to a component that is provided
 *   by config and replaces the contents of the form
 *     - allow this to be infinately deep
 * 
 */

 const positionStyles = (pos: GroupPosition) => {
    switch (pos) {
        case 'start':
            return styles.startOfGroupSection
        case 'middle':
            return styles.middleOfGroupSection
        case 'end':
            return styles.endOfGroupSection
        default:
            return null;
    }
}

const DefaultSection = observer((props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    groupPosition?: GroupPosition
}) => {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        props.openLink(props.linkTo);
    }

    const preview = unwrap(props.inputConfig.previewLabel)
    const placeHolder = unwrap(props.inputConfig.headerLabel)

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return preview 
            ? <>
                <Pressable style={resolvedStyles} onPress={expand}>
                    <Text style={[styles.label, { flex: 1 }]}>{preview}</Text>
                    { !props.inputConfig.disabled
                        ? <IconButton
                            style={{ flex: 0, height: 30, width: 30, marginLeft: 20 }}
                            icon='chevron-right' 
                            color='rgba(60,60,67,.3)'
                            onPress={expand}
                            size={30} />
                        : null
                    }
                </Pressable>
                {
                    partialBottomBorder
                        ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                        : null
                }
            </>
            : <>
                <Pressable style={resolvedStyles} onPress={expand}>
                    <Text style={[styles.label, styles.placeholder]}>{placeHolder || ''}</Text>
                    { !props.inputConfig.disabled
                        ? <IconButton
                            style={{ flex: 0, height: 30, width: 30 }}
                            icon='chevron-right' 
                            color='rgba(60,60,67,.3)'
                            onPress={expand}
                            size={30} />
                        : null
                    }
                </Pressable>
                {
                    partialBottomBorder
                        ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                        : null
                }
            </>
})

// doesn't need to be observer because inline components must be observers themselves 
function InlineSection(props: { 
    inputConfig: InlineFormInputConfig,
    inlineComponent: ComponentType<SectionInlineViewProps>,
    groupPosition?: GroupPosition
}) {
    const Label: ComponentType<SectionInlineViewProps> = props.inlineComponent;

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return (
        <>
            <View style={resolvedStyles}>
                <View style={{ flex: 1 }}>
                    <Label config={props.inputConfig}/>
                </View>
            </View>
            {
                partialBottomBorder
                    ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                    : null
            }
        </>
    )
}

const LabelSection = observer((props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    groupPosition?: GroupPosition,
    labelComponent: ComponentType<SectionLabelViewProps>,
}) => {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        props.openLink(props.linkTo);
    }

    const Label: ComponentType<SectionLabelViewProps> = props.labelComponent;

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return (
        <>
            <View style={resolvedStyles}>
                <View style={{ flex: 1 }}>
                    <Label config={props.inputConfig} expand={expand} />
                </View>
                { !props.inputConfig.disabled
                    ? <IconButton
                        style={{ flex: 0, height: 30, width: 30 }}
                        icon='chevron-right' 
                        color='rgba(60,60,67,.3)'
                        onPress={expand}
                        size={30} />
                    : null
                }
            </View>
            {
                partialBottomBorder
                    ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                    : null
            }
        </>
    )
})


const styles = StyleSheet.create({
    section: {
      minHeight: 60,
      borderStyle: 'solid',
      borderBottomColor: '#ccc',
      borderBottomWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      width: '100%',
      paddingLeft: 60,
    //   paddingRight: 20,
      justifyContent: 'space-between'
    }, 
    startOfGroupSection: {
        borderBottomWidth: 0
    },
    middleOfGroupSection: {
        borderBottomWidth: 0,
        borderTopWidth: 0
    },
    endOfGroupSection: {
        borderTopWidth: 0
    },
    disabledSection: {
        backgroundColor: '#E0DEE0'
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
    submitButton: {
        height: 44,
        borderRadius: 24,
        color: '#fff',
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        margin: 20
    },
    disabledSubmitButton: {
        color: '#fff',
        backgroundColor: Colors.primary.delta,
    }
})