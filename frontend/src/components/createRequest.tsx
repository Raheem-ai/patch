import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../errors";
import { HelpRequest, RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../common/models";
import Form, { FormProps } from "./forms/form";
import { allEnumValues } from "../../../common/utils";
import { FormInputConfig } from "./forms/types";
import { ResponderCountRange } from "../constants";
import { BottomDrawerViewVisualArea } from "./helpers/visualArea";
import { KeyboardAvoidingView, Platform } from "react-native";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
        createStore.clear();
    }

    static submit = {
        isValid: () => {
            const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
            return !!createStore.location && !!createStore.type.length && createStore.respondersNeeded != null
        },
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
            const alertStore = getStore<IAlertStore>(IAlertStore);
            
            let createdReq: HelpRequest;

            try {
                createdReq = await createStore.createRequest()
            } catch(e) {
                alertStore.toastError(resolveErrorMessage(e))
                return
            }

            alertStore.toastSuccess(`Successfully created request ${createdReq.displayId}`)

            bottomDrawerStore.hide()
        },
        label: 'Add'
    }

    static minimizeLabel = 'Create Request';

    createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
    requestStore = getStore<IRequestStore>(IRequestStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    headerLabel = () => {
        return 'Create Request'
    }
    
    formProps = (): FormProps => {
        return {
            headerLabel: this.headerLabel(), 
            onExpand: () => {
                this.bottomDrawerStore.hideHeader();
            },
            onBack: () => {
                this.bottomDrawerStore.showHeader();
            },
            inputs: [
                {
                    onSave: (location) => this.createStore.location = location,
                    val: () => {
                        return this.createStore.location
                    },
                    isValid: () => {
                        return this.createStore.locationValid
                    },
                    name: 'location',
                    previewLabel: () => this.createStore.location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                {
                    onSave: (type) => this.createStore.type = type,
                    val: () => {
                        return this.createStore.type
                    },
                    isValid: () => {
                        return this.createStore.typeValid
                    },
                    name: 'type',
                    previewLabel: () => null,
                    headerLabel: () => 'Type of request',
                    type: 'TagList',
                    required: true,
                    props: {
                        options: allEnumValues(RequestType),
                        optionToPreviewLabel: (opt) => RequestTypeToLabelMap[opt],
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            this.createStore.type.splice(idx, 1)
                        },
                        dark: true
                    }
                },
                {
                    onSave: (notes) => this.createStore.notes = notes,
                    val: () => {
                        return this.createStore.notes
                    },
                    isValid: () => {
                        return !!this.createStore.notes
                    },
                    name: 'notes',
                    previewLabel: () => this.createStore.notes,
                    headerLabel: () => 'Notes',
                    type: 'TextArea',
                },
                {
                    onSave: (skills) => this.createStore.skills = skills,
                    val: () => {
                        return this.createStore.skills
                    },
                    isValid: () => {
                        return true
                    },
                    name: 'skills',
                    previewLabel: () => null,
                    headerLabel: () => 'Skills',
                    type: 'NestedTagList',
                    props: {
                        options: allEnumValues(RequestSkill),
                        categories: Object.keys(RequestSkillCategoryMap), 
                        optionToPreviewLabel: (opt) => RequestSkillToLabelMap[opt],
                        categoryToLabel: (cat) => RequestSkillCategoryToLabelMap[cat],
                        optionsFromCategory: (cat) => Array.from(RequestSkillCategoryMap[cat].values()),
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            this.createStore.skills.splice(idx, 1)
                        },
                    },
                },
                {
                    onSave: (responders) => this.createStore.respondersNeeded = responders.length ? responders[0] : -1,
                    val: () => {
                        return [this.createStore.respondersNeeded]
                    },
                    isValid: () => {
                        return typeof this.createStore.respondersNeeded == 'number' && this.createStore.respondersNeeded > -1
                    },
                    name: 'responders',
                    previewLabel: () => this.createStore.respondersNeeded >= 0 ? `${this.createStore.respondersNeeded}` : null,
                    headerLabel: () => 'Responders needed',
                    type: 'List',
                    props: {
                        options: ResponderCountRange,
                        optionToPreviewLabel: (opt) => opt
                    },
                }
                
            ] as [
                FormInputConfig<'Map'>, 
                FormInputConfig<'TagList'>, 
                FormInputConfig<'TextArea'>,
                FormInputConfig<'NestedTagList'>,
                FormInputConfig<'List'>,
            ]
        }
    }

    render() {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <BottomDrawerViewVisualArea>
                    <Form {...this.formProps()}/>
                </BottomDrawerViewVisualArea>
            </KeyboardAvoidingView>
        )
    }
}

export default CreateHelpRequest
