import React from "react";
import { editRequestStore, requestStore, bottomDrawerStore, alertStore } from "../../../stores/interfaces";
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import Form, { FormProps } from "../../forms/form";
import { RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import { FormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import { ResponderCountRange } from "../../../constants";
import { KeyboardAvoidingView, Platform } from "react-native";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        editRequestStore().clear();
    }

    static submit = {
        isValid: () => {
            return !!editRequestStore().location && !!editRequestStore().type.length && editRequestStore().respondersNeeded >= 0
        },
        action: async () => {
            try {
                await editRequestStore().editRequest(requestStore().currentRequest.id)
            } catch (e) {
                alertStore().toastError(resolveErrorMessage(e))
                return
            }

            alertStore().toastSuccess(`Successfully updated request ${requestStore().currentRequest.displayId}`)

            bottomDrawerStore().hide()
        },
        label: 'Save'
    }

    async componentDidMount() {
        editRequestStore().loadRequest(requestStore().currentRequest);
    }

    headerLabel = () => {
        return `Edit Request ${requestStore().currentRequest.displayId}`
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
                    onSave: (location) => editRequestStore().location = location,
                    val: () => {
                        return editRequestStore().location
                    },
                    isValid: () => {
                        return editRequestStore().locationValid
                    },
                    name: 'location',
                    previewLabel: () => editRequestStore().location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                {
                    onSave: (type) => editRequestStore().type = type,
                    val: () => {
                        return editRequestStore().type
                    },
                    isValid: () => {
                        return editRequestStore().typeValid
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
                            editRequestStore().type.splice(idx, 1)
                        },
                        dark: true
                    }
                },
                {
                    onSave: (notes) => editRequestStore().notes = notes,
                    val: () => {
                        return editRequestStore().notes
                    },
                    isValid: () => {
                        return !!editRequestStore().notes
                    },
                    name: 'notes',
                    previewLabel: () => editRequestStore().notes,
                    headerLabel: () => 'Notes',
                    type: 'TextArea',
                },
                {
                    onSave: (skills) => editRequestStore().skills = skills,
                    val: () => {
                        return editRequestStore().skills
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
                            editRequestStore().skills.splice(idx, 1)
                        },
                    },
                },
                {
                    onSave: (responders) => editRequestStore().respondersNeeded = responders.length ? responders[0] : -1,
                    val: () => {
                        return [editRequestStore().respondersNeeded]
                    },
                    isValid: () => {
                        return typeof editRequestStore().respondersNeeded == 'number' && editRequestStore().respondersNeeded > -1
                    },
                    name: 'responders',
                    previewLabel: () => `${editRequestStore().respondersNeeded}`,
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
