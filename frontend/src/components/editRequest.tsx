import React from "react";
import { IEditRequestStore, IRequestStore, IBottomDrawerStore, BottomDrawerHandleHeight, IAlertStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../errors";
import Form, { FormProps } from "./forms/form";
import { RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../common/models";
import { allEnumValues } from "../../../common/utils";
import { FormInputConfig } from "./forms/types";
import { BottomDrawerViewVisualArea } from "./helpers/visualArea";
import { ResponderCountRange } from "../constants";
import { KeyboardAvoidingView, Platform } from "react-native";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const editStore = getStore<IEditRequestStore>(IEditRequestStore);
        editStore.clear();
    }

    static submit = {
        isValid: () => {
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            return !!editStore.location && !!editStore.type.length && editStore.respondersNeeded >= 0
        },
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            const requestStore = getStore<IRequestStore>(IRequestStore);
            const alertStore = getStore<IAlertStore>(IAlertStore);

            try {
                await editStore.editRequest(requestStore.currentRequest.id)
            } catch (e) {
                alertStore.toastError(resolveErrorMessage(e))
                return
            }

            alertStore.toastSuccess(`Successfully updated request ${requestStore.currentRequest.displayId}`)

            bottomDrawerStore.hide()
        },
        label: 'Save'
    }

    editStore = getStore<IEditRequestStore>(IEditRequestStore);
    requestStore = getStore<IRequestStore>(IRequestStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

    async componentDidMount() {
        this.editStore.loadRequest(this.requestStore.currentRequest);
    }

    headerLabel = () => {
        return `Edit Request ${this.requestStore.currentRequest.displayId}`
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
                    onSave: (location) => this.editStore.location = location,
                    val: () => {
                        return this.editStore.location
                    },
                    isValid: () => {
                        return this.editStore.locationValid
                    },
                    name: 'location',
                    previewLabel: () => this.editStore.location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                {
                    onSave: (type) => this.editStore.type = type,
                    val: () => {
                        return this.editStore.type
                    },
                    isValid: () => {
                        return this.editStore.typeValid
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
                            this.editStore.type.splice(idx, 1)
                        },
                        dark: true
                    }
                },
                {
                    onSave: (notes) => this.editStore.notes = notes,
                    val: () => {
                        return this.editStore.notes
                    },
                    isValid: () => {
                        return !!this.editStore.notes
                    },
                    name: 'notes',
                    previewLabel: () => this.editStore.notes,
                    headerLabel: () => 'Notes',
                    type: 'TextArea',
                },
                {
                    onSave: (skills) => this.editStore.skills = skills,
                    val: () => {
                        return this.editStore.skills
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
                            this.editStore.skills.splice(idx, 1)
                        },
                    },
                },
                {
                    onSave: (responders) => this.editStore.respondersNeeded = responders.length ? responders[0] : -1,
                    val: () => {
                        return [this.editStore.respondersNeeded]
                    },
                    isValid: () => {
                        return typeof this.editStore.respondersNeeded == 'number' && this.editStore.respondersNeeded > -1
                    },
                    name: 'responders',
                    previewLabel: () => `${this.editStore.respondersNeeded}`,
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

export default EditHelpRequest
