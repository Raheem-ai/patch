import React from "react";
import { editRequestStore, requestStore, bottomDrawerStore, alertStore } from "../../../stores/interfaces";
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import Form, { FormProps } from "../../forms/form";
import { PatchPermissions, RequestPriority, RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import { ResponderCountRange } from "../../../constants";
import { KeyboardAvoidingView, Platform } from "react-native";
import { runInAction } from "mobx";
import { TagsListInput } from "../../forms/inputs/defaults/defaultTagListInputConfig";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        editRequestStore().clear();
    }

    static submit = {
        isValid: () => {
            return !!editRequestStore().type.length
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
                [
                    // Call Start
                    {
                        onChange: (callStartedAt) => editRequestStore().callStartedAt = callStartedAt,
                        val: () => {
                            return editRequestStore().callStartedAt
                        },
                        isValid: () => {
                            return true
                        },
                        name: 'callStart',
                        placeholderLabel: () => 'Call start',
                        type: 'TextInput',
                        icon: 'phone-incoming'
                        // required: true
                    },
                    // Call End
                    {
                        onChange: (callEndedAt) => editRequestStore().callEndedAt = callEndedAt,
                        val: () => {
                            return editRequestStore().callEndedAt
                        },
                        isValid: () => {
                            return true
                        },
                        name: 'callEnd',
                        placeholderLabel: () => 'Call end',
                        type: 'TextInput',
                    },
                ],
                [
                    // Caller Name
                    {
                        onChange: (callerName) => editRequestStore().callerName = callerName,
                        val: () => {
                            return editRequestStore().callerName
                        },
                        isValid: () => {
                            return true
                        },
                        name: 'callerName',
                        placeholderLabel: () => 'Caller name',
                        type: 'TextInput',
                        icon: 'clipboard-account'
                        // required: true
                    },
                    // Caller Contact Info
                    {
                        onChange: (callerContactInfo) => editRequestStore().callerContactInfo = callerContactInfo,
                        val: () => {
                            return editRequestStore().callerContactInfo
                        },
                        isValid: () => {
                            return true
                        },
                        name: 'callerContactInfo',
                        placeholderLabel: () => 'Caller contact info',
                        type: 'TextInput',
                    },
                ],
                // Location
                {
                    onSave: (location) => editRequestStore().location = location,
                    val: () => {
                        return editRequestStore().location
                    },
                    isValid: () => {
                        return editRequestStore().locationValid
                    },
                    name: 'location',
                    icon: 'map-marker',
                    previewLabel: () => editRequestStore().location?.address,
                    headerLabel: () => 'Location',
                    placeholderLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                [
                    // Description
                    {
                        onSave: (notes) => editRequestStore().notes = notes,
                        val: () => {
                            return editRequestStore().notes
                        },
                        isValid: () => {
                            return !!editRequestStore().notes
                        },
                        name: 'description',
                        icon: 'note-text',
                        previewLabel: () => editRequestStore().notes,
                        headerLabel: () => 'Description',
                        placeholderLabel: () => 'Description',
                        type: 'TextArea',
                    },
                    // Type of request
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
                        placeholderLabel: () => 'Type of request',
                        type: 'TagList',
                        required: true,
                        props: {
                            options: allEnumValues(RequestType),
                            optionToPreviewLabel: (opt) => RequestTypeToLabelMap[opt],
                            multiSelect: true,
                            onTagDeleted: (idx: number, val: any) => {
                                runInAction(() => editRequestStore().type.splice(idx, 1))
                            },
                            dark: true
                        }
                    },
                    // Priority
                    {
                        onSave: (priorities) => editRequestStore().priority = priorities[0],
                        val: () => {
                            return editRequestStore().priority 
                                ? [editRequestStore().priority]
                                : []
                        },
                        isValid: () => {
                            return !!editRequestStore().priority 
                        },
                        name: 'priority',
                        previewLabel: () => editRequestStore().priority as unknown as string,
                        headerLabel: () => 'Priority',
                        placeholderLabel: () => 'Priority',
                        type: 'List',
                        props: {
                            options: allEnumValues(RequestPriority),
                            optionToPreviewLabel: (opt) => opt
                        },
                    },
                ],
                // Positions
                {
                    onSave: (data) => {
                        editRequestStore().positions = data
                    },
                    val: () => {
                        return editRequestStore().positions;
                    },
                    isValid: () => true,
                    headerLabel: () => 'Responders needed',
                    placeholderLabel: () => 'Responders needed',
                    icon: 'account-multiple',
                    props: {
                        editPermissions: [PatchPermissions.RequestAdmin]
                    },
                    name: 'positions',
                    type: 'Positions'
                },
                // Tags
                TagsListInput({
                    onSave: (items) => {
                        editRequestStore().tagHandles = items
                    },
                    val: () => {
                        return editRequestStore().tagHandles
                    },
                    isValid: () => {
                        return true
                    },
                    icon: 'label',
                    name: 'tags'
                })
            ] as [
                [
                    InlineFormInputConfig<'TextInput'>,
                    InlineFormInputConfig<'TextInput'>
                ],
                [
                    InlineFormInputConfig<'TextInput'>,
                    InlineFormInputConfig<'TextInput'>
                ],
                ScreenFormInputConfig<'Map'>, 
                [
                    ScreenFormInputConfig<'TextArea'>,
                    ScreenFormInputConfig<'TagList'>,
                    ScreenFormInputConfig<'List'>
                ],
                ScreenFormInputConfig<'Positions'>,
                ScreenFormInputConfig<'CategorizedItemList'>
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
