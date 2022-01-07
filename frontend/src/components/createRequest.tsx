import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore, createRequestStore, alertStore, bottomDrawerStore } from "../stores/interfaces";
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
        createRequestStore().clear();
    }

    static submit = {
        isValid: () => {
            return !!createRequestStore().location && !!createRequestStore().type.length && createRequestStore().respondersNeeded != null
        },
        action: async () => {
            let createdReq: HelpRequest;

            try {
                createdReq = await createRequestStore().createRequest()
            } catch(e) {
                alertStore().toastError(resolveErrorMessage(e))
                return
            }

            alertStore().toastSuccess(`Successfully created request ${createdReq.displayId}`)

            bottomDrawerStore().hide()
        },
        label: 'Add'
    }

    static minimizeLabel = 'Create Request';

    headerLabel = () => {
        return 'Create Request'
    }
    
    formProps = (): FormProps => {
        return {
            headerLabel: this.headerLabel(), 
            onExpand: () => {
                bottomDrawerStore().hideHeader();
            },
            onBack: () => {
                bottomDrawerStore().showHeader();
            },
            inputs: [
                {
                    onSave: (location) => createRequestStore().location = location,
                    val: () => {
                        return createRequestStore().location
                    },
                    isValid: () => {
                        return createRequestStore().locationValid
                    },
                    name: 'location',
                    previewLabel: () => createRequestStore().location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                {
                    onSave: (type) => createRequestStore().type = type,
                    val: () => {
                        return createRequestStore().type
                    },
                    isValid: () => {
                        return createRequestStore().typeValid
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
                            createRequestStore().type.splice(idx, 1)
                        },
                        dark: true
                    }
                },
                {
                    onSave: (notes) => createRequestStore().notes = notes,
                    val: () => {
                        return createRequestStore().notes
                    },
                    isValid: () => {
                        return !!createRequestStore().notes
                    },
                    name: 'notes',
                    previewLabel: () => createRequestStore().notes,
                    headerLabel: () => 'Notes',
                    type: 'TextArea',
                },
                {
                    onSave: (skills) => createRequestStore().skills = skills,
                    val: () => {
                        return createRequestStore().skills
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
                            createRequestStore().skills.splice(idx, 1)
                        },
                    },
                },
                {
                    onSave: (responders) => createRequestStore().respondersNeeded = responders.length ? responders[0] : -1,
                    val: () => {
                        return [createRequestStore().respondersNeeded]
                    },
                    isValid: () => {
                        return typeof createRequestStore().respondersNeeded == 'number' && createRequestStore().respondersNeeded > -1
                    },
                    name: 'responders',
                    previewLabel: () => createRequestStore().respondersNeeded >= 0 ? `${createRequestStore().respondersNeeded}` : null,
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
