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

// const windowDimensions = Dimensions.get("screen");

export type FormProps = {
    headerLabel: string,

    // TODO: change this to() FormInputConfig | FormInputConfig[])[] to allow for visually grouped components
    inputs: FormInputConfig[],
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

@observer
export default class Form extends React.Component<FormProps> {
    isHome = computed<boolean>(() => {
        return !this.state.screenId;
    })

    // used internally to know whether the form is submittable
    private isValid = computed<boolean>(() => {
        return this.inputs.get().filter(i => i.required).every(i => i.isValid());
    })

    // used to unpack nested input configs from compound inputs
    private inputs = computed<StandAloneFormInputConfig[]>(() => {
        return this.flattenInputConfigs(this.props.inputs)
    })

    submitting = observable.box<boolean>(false)

    // screenId == null means we're on home page
    state = {
        screenId: null
    }

    flattenInputConfigs = (inputConfigs: FormInputConfig[]) => {
        const flattenedInputConfigs: StandAloneFormInputConfig[] = [];
        
        inputConfigs.forEach(config => {
            const isCompoundInput = (config as any as CompoundFormInputConfig).inputs;

            if (isCompoundInput) {
                const nestedInputConfigs = (config as any as CompoundFormInputConfig).inputs?.()

                if (nestedInputConfigs && nestedInputConfigs.length) {
                    flattenedInputConfigs.push(...this.flattenInputConfigs(nestedInputConfigs))
                }
            } else {
                flattenedInputConfigs.push(config as StandAloneFormInputConfig)
            }
        })

        return flattenedInputConfigs
    }

    openLink = (id: string) => {
        this.setState({ screenId: id });
        this.props.onExpand?.()
    }

    back = () => {
        this.setState({ screenId: null });
        this.props.onBack?.()
    }
    
    listView = () => {

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


        const renderInputs = () => {

            // TODO: for component groups, render each individual component section with a groupStart/groupMiddle/groupEnd flag to allow for visually grouped components
            // ie LabelSection, InlineSection, DefaultSection need a new prop like groupPosition?: 'start' | 'middle' | 'end'
            return this.inputs.get().map(inputConfig => {
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
                        openLink={this.openLink}  
                        linkTo={inputConfig.name} />
                }

                const inlineComponent = (viewConfig as InlineFormInputViewConfig).inlineComponent || null;

                if (inlineComponent) {    
                    return <InlineSection 
                        inputConfig={inlineInputConfig}
                        inlineComponent={inlineComponent} />
                }

                return <DefaultSection 
                    inputConfig={screenInputConfig}
                    openLink={this.openLink}  
                    linkTo={inputConfig.name} />
            })
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

    render() {

        if (this.submitting.get()) {
            return <Loader/>
        }

        if (this.state.screenId) {
            const inputConfig = this.inputs.get().find((i) => i.name == this.state.screenId) as ScreenFormInputConfig;
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

                return <ScreenComponent back={this.back} config={inputConfig}/>
            }
        }
            
        return this.listView();
    }
}

function DefaultSection(props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void
}) {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        props.openLink(props.linkTo);
    }

    const preview = unwrap(props.inputConfig.previewLabel)
    const placeHolder = unwrap(props.inputConfig.headerLabel)

    return preview 
            ? <Pressable style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]} onPress={expand}>
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
            : <Pressable style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]} onPress={expand}>
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
}

function InlineSection(props: { 
    inputConfig: InlineFormInputConfig,
    inlineComponent: ComponentType<SectionInlineViewProps>,
}) {
    const Label: ComponentType<SectionInlineViewProps> = props.inlineComponent;

    return (
        <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]}>
            <View style={{ flex: 1 }}>
                <Label config={props.inputConfig}/>
            </View>
        </View>
    )
}

function LabelSection(props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    labelComponent: ComponentType<SectionLabelViewProps>,
}) {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        props.openLink(props.linkTo);
    }

    const Label: ComponentType<SectionLabelViewProps> = props.labelComponent;

    return (
        <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]}>
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
    )
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