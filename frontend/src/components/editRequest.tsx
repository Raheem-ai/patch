import React, { ComponentType, useCallback, useState } from "react";
import { Button, Text, List, IconButton } from 'react-native-paper';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput as RNTextInput, View } from "react-native";
import { RequestSkill, RequestSkillCategory, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import { CreateReqData, IEditRequestStore, ILocationStore, IRequestStore, IBottomDrawerStore, BottomDrawerView, BottomDrawerHandleHeight, ITempRequestStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { useRef } from "react";
import { useKeyboard } from "../hooks/useKeyboard";
import MapView, { MapEvent, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { HeaderHeight } from "../components/header/header";
import { observer } from "mobx-react";
import { IMapsService } from "../services/interfaces";
import { debounce } from "lodash";
import { getService } from "../services/meta";
import { GeocodeResult, LatLngLiteral, LatLngLiteralVerbose, PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";
import Tags from "../components/tags";
import { runInAction } from "mobx";
import RequestForm from "./requestForm";

const windowDimensions = Dimensions.get("window");
const containerStyle = { height: windowDimensions.height - HeaderHeight - BottomDrawerHandleHeight };

const ResponderCountRange = [1, 2, 3, 4, 5];

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const editStore = getStore<IEditRequestStore>(IEditRequestStore);
        editStore.clear();
    }

    static submit = {
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            const requestStore = getStore<IRequestStore>(IRequestStore);

            await editStore.editRequest(requestStore.currentRequest.id)
            bottomDrawerStore.hide()
        },
        label: 'Save'
    }

    editStore = getStore<IEditRequestStore>(IEditRequestStore);
    requestStore = getStore<IRequestStore>(IRequestStore);

    async componentDidMount() {
        this.editStore.loadRequest(this.requestStore.currentRequest);
    }

    headerLabel = () => {
        return `Edit Request ${this.requestStore.currentRequest.displayId}`
    }
    
    render() {
        return <RequestForm headerLabel={this.headerLabel()} tempStore={this.editStore} />
    }
}

export default EditHelpRequest
