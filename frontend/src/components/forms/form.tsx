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
import { FormInputConfig, FormInputViewConfig, FormInputViewMap, SectionScreenProps, SectionViewProps } from "./types";
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

// const windowDimensions = Dimensions.get("screen");

export type FormProps = {
    headerLabel: string,
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
        labelComponent: TagListLabel as React.ComponentType<SectionViewProps<"TagList">>
    },
    'NestedList': {
        screenComponent: NestedListInput
    },
    'NestedTagList': {
        screenComponent: NestedListInput,
        labelComponent: TagListLabel as React.ComponentType<SectionViewProps<"NestedTagList">>
    },
    'Map': {
        screenComponent: MapInput
    }
}

const WrappedScrollView = wrapScrollView(ScrollView)

@observer
export default class Form extends React.Component<FormProps> {
    isHome = computed<boolean>(() => {
        return !this.state.screenId;
    })
    isValid = computed<boolean>(() => {
        return this.props.inputs.filter(i => i.required).every(i => i.isValid());
    })

    submitting = observable.box<boolean>(false)

    // screenId == null means we're on home page
    state = {
        screenId: null
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
                        {
                            this.props.inputs.map((inputConfig) => {
                                const textLabel = unwrap(inputConfig.previewLabel) || null;

                                const viewConfig = FormViewMap[inputConfig.type];

                                // make sure any inline store updates are being run in an action 
                                // (for convenience)
                                if (inputConfig.onChange) {
                                    const oldOnChange = inputConfig.onChange;
                                    
                                    inputConfig.onChange = (...args) => {
                                        runInAction(() => {
                                            return oldOnChange(...args)
                                        })
                                    }
                                }

                                if (inputConfig.onSave) {
                                    const oldOnSave = inputConfig.onSave;
                                    
                                    inputConfig.onSave = (...args) => {
                                        runInAction(() => {
                                            return oldOnSave(...args)
                                        })
                                    }
                                }

                                return <Section 
                                            viewConfig={viewConfig}
                                            inputConfig={inputConfig}
                                            labelComponent={viewConfig.inlineComponent || viewConfig.labelComponent || null}
                                            openLink={this.openLink}  
                                            linkTo={inputConfig.name} 
                                            label={textLabel}/>
                            })
                        }
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
            const inputConfig = this.props.inputs.find((i) => i.name == this.state.screenId);
            const viewConfig = FormViewMap[inputConfig.type];

            const Component: ComponentType<SectionScreenProps> = viewConfig.screenComponent;
            
            if (Component) {
                return <Component back={this.back} config={inputConfig}/>
            }
        }
            
        return this.listView();
    }
}

function Section(props: { 
    viewConfig: FormInputViewConfig,
    inputConfig: FormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    labelComponent?: ComponentType<SectionViewProps>,
    label?: string
}) {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        props.openLink(props.linkTo);
    }

    const Label: ComponentType<SectionViewProps> = props.labelComponent;
    const preview = unwrap(props.inputConfig.previewLabel)
    const placeHolder = unwrap(props.inputConfig.headerLabel)

    const hasScreenView = !!props.viewConfig.screenComponent

    return Label
        ? <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]}>
            <View style={{ flex: 1 }}>
                <Label config={props.inputConfig} expand={hasScreenView ? expand : null} />
            </View>
            { hasScreenView && !props.inputConfig.disabled
                ? <IconButton
                    style={{ flex: 0, height: 30, width: 30 }}
                    icon='chevron-right' 
                    color='rgba(60,60,67,.3)'
                    onPress={expand}
                    size={30} />
                : null
            }
        </View>
        : preview 
            ? <Pressable style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]} onPress={expand}>
                <Text style={[styles.label, { flex: 1 }]}>{preview}</Text>
                { hasScreenView && !props.inputConfig.disabled
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
                <Text style={[styles.label, styles.placeholder]}>{placeHolder}</Text>
                { hasScreenView && !props.inputConfig.disabled
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