import React from "react";
import { editRequestStore, requestStore, bottomDrawerStore, alertStore, organizationStore } from "../../../stores/interfaces";
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { categorizedItemsToRequestType, PatchPermissions, RequestPriority, RequestPriorityToLabelMap, RequestTypeCategories, requestTypesToCategorizedItems } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { ScrollView, View } from "react-native";
import { observable, runInAction } from "mobx";
import { TagsListInput } from "../../forms/inputs/defaults/defaultTagListInputConfig";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";
import STRINGS from "../../../../../common/strings";
import { ICONS } from "../../../types";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {
    formInstance = observable.box<Form>(null);

    componentDidMount() {
        editRequestStore().loadRequest(requestStore().currentRequest);
    }

    headerLabel = () => {
        return `Edit Request ${requestStore().currentRequest.displayId}`
    }

    setRef = (formRef: Form) => {
        runInAction(() => {
            this.formInstance.set(formRef)
        })
    }

    formHomeScreen = observer(({
        renderHeader,
        renderInputs,
        inputs
    }: CustomFormHomeScreenProps) => {
        const headerConfig: BackButtonHeaderProps = {
            cancel: {
                handler: async () => {
                    editRequestStore().clear();
                },
            },
            save: {
                handler: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()
                        await editRequestStore().editRequest(requestStore().currentRequest.id)
                    } catch (e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }
        
                    alertStore().toastSuccess(STRINGS.ACCOUNT.updatedRequestSuccess(organizationStore().metadata.requestPrefix + '–' + requestStore().currentRequest.displayId))
        
                    bottomDrawerStore().hide()
                },
                label: 'Save',
                validator: () => {
                    return this.formInstance.get()?.isValid.get()
                }
            },
            bottomDrawerView: true
        }

        return (
            <KeyboardAwareArea>
                <BackButtonHeader {...headerConfig} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(inputs()) }
                    </View>
                </ScrollView>
            </KeyboardAwareArea>
        )
    })
    
    formProps = (): FormProps => {
        return {
            headerLabel: this.headerLabel(), 
            homeScreen: this.formHomeScreen,
            inputs: [
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
                        icon: ICONS.request,
                        previewLabel: () => editRequestStore().notes,
                        headerLabel: () => 'Description',
                        placeholderLabel: () => 'Description',
                        type: 'TextArea',
                        required: true
                    },
                    // Type of request
                    {
                        type: 'CategorizedItemList',
                        headerLabel: () => 'Type of request',
                        placeholderLabel: () => 'Type of request',
                        onSave: (type) => editRequestStore().type = categorizedItemsToRequestType(type),
                        val: () => {
                            return requestTypesToCategorizedItems(editRequestStore().type)
                        },
                        isValid: () => {
                            return editRequestStore().typeValid
                        },
                        name: 'type',
                        // required: true,
                        props: {
                            definedCategories: () => RequestTypeCategories,
                            dark: true,
                            setDefaultClosed: true
                        }
                    },
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
                        previewLabel: () => editRequestStore().location?.address,
                        headerLabel: () => 'Location',
                        placeholderLabel: () => 'Location',
                        type: 'Map',
                        // required: true
                    },
                ],
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
                        icon: ICONS.timeCallStarted,
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
                    icon: ICONS.accountMultiple,
                    props: {
                        editPermissions: [PatchPermissions.RequestAdmin]
                    },
                    name: 'positions',
                    type: 'Positions'
                },
                // Priority
                {
                    onSave: (priorities) => editRequestStore().priority = priorities[0],
                    val: () => {
                        return typeof editRequestStore().priority == 'number'
                            ? [editRequestStore().priority]
                            : []
                    },
                    isValid: () => {
                        return !!editRequestStore().priority 
                    },
                    name: 'priority',
                    icon: editRequestStore().priority == 2 
                        ? ICONS.priority3 
                        : editRequestStore().priority == 1
                            ? ICONS.priority2
                            : ICONS.priority1,
                    previewLabel: () => RequestPriorityToLabelMap[editRequestStore().priority],
                    headerLabel: () => 'Priority',
                    placeholderLabel: () => 'Priority',
                    type: 'List',
                    props: {
                        options: allEnumValues(RequestPriority),
                        optionToPreviewLabel: (opt) => RequestPriorityToLabelMap[opt]
                    }
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
                    icon: ICONS.tag,
                    name: 'tags'
                })
            ] as [
                [
                    ScreenFormInputConfig<'TextArea'>,
                    ScreenFormInputConfig<'CategorizedItemList'>,
                    ScreenFormInputConfig<'Map'>, 
                ],
                [
                    InlineFormInputConfig<'TextInput'>,
                    InlineFormInputConfig<'TextInput'>,
                    InlineFormInputConfig<'TextInput'>,
                    InlineFormInputConfig<'TextInput'>
                ],
                ScreenFormInputConfig<'Positions'>,
                ScreenFormInputConfig<'List'>,

                ScreenFormInputConfig<'CategorizedItemList'>
            ]
        }
    }

    render() {
        return <Form ref={this.setRef} {...this.formProps()}/>
    }
}

export default EditHelpRequest
