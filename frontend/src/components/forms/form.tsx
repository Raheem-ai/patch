import React, { ComponentType, useCallback, useState } from "react";
import { Button, Text, List, IconButton } from 'react-native-paper';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { RequestSkill, RequestSkillCategory, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../common/models";
import { useRef } from "react";
import { observer } from "mobx-react";
import { debounce } from "lodash";
import { GeocodeResult, LatLngLiteral, LatLngLiteralVerbose, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import Tags from "../../components/tags";
import { configure, runInAction } from "mobx";
import { getStore } from "../../stores/meta";
import { AddressableLocation } from "../../../../common/models";
import { FormInputConfig, FormInputViewConfig, FormInputViewMap, SectionScreenProps, SectionViewProps } from "./types";
import TextAreaInput from "./inputs/textAreaInput";
import { unwrap } from "../../../../common/utils";
import TextInput from "./inputs/textInput";
import { Colors } from "../../types";
import ListInput from "./inputs/listInput";
import TagListLabel from "./inputs/tagListLabel";
import NestedListInput from "./inputs/nestedListInput";

// const windowDimensions = Dimensions.get("screen");

export type FormProps = {
    headerLabel: string,
    inputs: FormInputConfig[],
    onExpand?(): void,
    onBack?(): void,
    submit?: {
        label: string,
        handler: () => void
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
    }
}

@observer
export default class Form extends React.Component<FormProps> {

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
        return (
            <View style={{ flex: 1 }}>
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
                            onPress={this.props.submit.handler}
                            color={styles.submitButton.color}
                            icon='account-plus' 
                            style={styles.submitButton}>{this.props.submit.label}</Button>
                        : null
                }
            </View>
        )
    }

    render() {

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
        props.openLink(props.linkTo);
    }

    const Label: ComponentType<SectionViewProps> = props.labelComponent;
    const preview = unwrap(props.inputConfig.previewLabel)
    const placeHolder = unwrap(props.inputConfig.headerLabel)

    const hasScreenView = !!props.viewConfig.screenComponent

    return Label
        ? <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]}>
            <View style={{ flex: 1 }}>
                <Label config={props.inputConfig} />
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
            ? <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]} onTouchStart={expand}>
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
            </View>
            : <View style={[styles.section, props.inputConfig.disabled ? styles.disabledSection : null]} onTouchStart={expand}>
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
            </View>
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
    }
})