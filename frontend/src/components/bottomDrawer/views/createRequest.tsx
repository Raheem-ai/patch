import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore, createRequestStore, alertStore, bottomDrawerStore } from "../../../stores/interfaces";
import { IObservableValue, observable, reaction, runInAction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { HelpRequest, PatchPermissions, RequestPriority, RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../../../common/models";
import Form, { FormProps } from "../../forms/form";
import { allEnumValues, dateToDateString, dateToDayOfWeekString } from "../../../../../common/utils";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { ResponderCountRange } from "../../../constants";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import { KeyboardAvoidingView, Platform } from "react-native";
import { TagsListInput } from "../../forms/inputs/defaults/defaultTagListInputConfig";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {
    formInstance = React.createRef<Form>();
    headerReactionDisposer = null;

    componentDidMount = () => {
        // checkStateChange gets called any time the form page, header visibility, or the expanded
        // state of the bottom drawer is updated. If any of these values have changed since the
        // last check, checkHeaderShowing is called to make sure the header is being properly
        // displayed or hidden based on the form page and expanded state.
        this.headerReactionDisposer = reaction(this.checkStateChange, this.checkHeaderShowing, {
            equals: (a, b) => a[0] == b[0] && a[1] == b[1] && a[2] == b[2],
            fireImmediately: true
        });
    }

    componentWillUnmount(): void {
        // Dispose of the reaction to prevent memory leaks.
        this.headerReactionDisposer();
    }
    
    static onHide = () => {
        createRequestStore().clear();
    }

    static onShow = () => {
        createRequestStore
    }

    static submit = {
        isValid: () => {
            return true
            //TODO
            // return !!createRequestStore().location && !!createRequestStore().type.length && createRequestStore().respondersNeeded != null
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

    checkStateChange = (): [boolean, boolean, boolean] => {
        // This function returns an array of the following information:
        // 1. Is the current form on its home page (or a sub-page).
        // 2. Is the header showing.
        // 3. Is the bottom drawer expanded.
        return [this.formInstance?.current?.isHome.get(), bottomDrawerStore().headerShowing, bottomDrawerStore().expanded];
    }

    checkHeaderShowing = ([formIsHome, headerShowing, isExpanded]) => {
        if (isExpanded) {
            // The bottom drawer is expanded.
            // We show the header if and only if
            // the form is on its home page.
            if (!formIsHome && headerShowing) {
                bottomDrawerStore().hideHeader();
            } else if (formIsHome && !headerShowing) {
                bottomDrawerStore().showHeader();
            }
        } else if (!isExpanded && !formIsHome && !headerShowing) {
            // If the bottom drawer is minimized, the header should be showing.
            // The header would already be visible if the form is on the home page,
            // so we can add a condition to only consider executing this block if we're
            // not on the home page.
            bottomDrawerStore().showHeader();
        }
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
                        onChange: (callStartedAt) => createRequestStore().callStartedAt = callStartedAt,
                        val: () => {
                            return createRequestStore().callStartedAt
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
                        onChange: (callEndedAt) => createRequestStore().callEndedAt = callEndedAt,
                        val: () => {
                            return createRequestStore().callEndedAt
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
                        onChange: (callerName) => createRequestStore().callerName = callerName,
                        val: () => {
                            return createRequestStore().callerName
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
                        onChange: (callerContactInfo) => createRequestStore().callerContactInfo = callerContactInfo,
                        val: () => {
                            return createRequestStore().callerContactInfo
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
                    onSave: (location) => createRequestStore().location = location,
                    val: () => {
                        return createRequestStore().location
                    },
                    isValid: () => {
                        return createRequestStore().locationValid
                    },
                    name: 'location',
                    icon: 'map-marker',
                    previewLabel: () => createRequestStore().location?.address,
                    headerLabel: () => 'Location',
                    placeholderLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                [
                    // Description
                    {
                        onSave: (notes) => createRequestStore().notes = notes,
                        val: () => {
                            return createRequestStore().notes
                        },
                        isValid: () => {
                            return !!createRequestStore().notes
                        },
                        name: 'description',
                        icon: 'note-text',
                        previewLabel: () => createRequestStore().notes,
                        headerLabel: () => 'Description',
                        placeholderLabel: () => 'Description',
                        type: 'TextArea',
                    },
                    // Type of request
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
                        placeholderLabel: () => 'Type of request',
                        type: 'TagList',
                        required: true,
                        props: {
                            options: allEnumValues(RequestType),
                            optionToPreviewLabel: (opt) => RequestTypeToLabelMap[opt],
                            multiSelect: true,
                            onTagDeleted: (idx: number, val: any) => {
                                runInAction(() => createRequestStore().type.splice(idx, 1))
                            },
                            dark: true
                        }
                    },
                    // Priority
                    {
                        onSave: (priorities) => createRequestStore().priority = priorities[0],
                        val: () => {
                            return createRequestStore().priority 
                                ? [createRequestStore().priority]
                                : []
                        },
                        isValid: () => {
                            return !!createRequestStore().priority 
                        },
                        name: 'priority',
                        previewLabel: () => createRequestStore().priority as unknown as string,
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
                        createRequestStore().positions = data
                    },
                    val: () => {
                        return createRequestStore().positions;
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
                        createRequestStore().tagHandles = items
                    },
                    val: () => {
                        return createRequestStore().tagHandles
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
                    <Form ref={this.formInstance} {...this.formProps()}/>
                </BottomDrawerViewVisualArea>
            </KeyboardAvoidingView>
        )
    }
}

export default CreateHelpRequest
