import React from "react";
import { createRequestStore, alertStore, bottomDrawerStore, organizationStore } from "../../../stores/interfaces";
import { observable, runInAction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { categorizedItemsToRequestType, HelpRequest, PatchPermissions, RequestPriority, RequestPriorityToLabelMap, RequestTypeCategories, requestTypesToCategorizedItems } from "../../../../../common/models";
import Form, { CustomFormHomeScreenProps, FormProps } from "../../forms/form";
import { allEnumValues } from "../../../../../common/utils";
import { InlineFormInputConfig, ScreenFormInputConfig } from "../../forms/types";
import { View } from "react-native";
import { TagsListInput } from "../../forms/inputs/defaults/defaultTagListInputConfig";
import BackButtonHeader, { BackButtonHeaderProps } from "../../forms/inputs/backButtonHeader";
import { ScrollView } from "react-native-gesture-handler";
import KeyboardAwareArea from "../../helpers/keyboardAwareArea";
import STRINGS from "../../../../../common/strings";
import TestIds from "../../../test/ids";
import { ICONS } from "../../../types";
import { requestDisplayName } from "../../../../../common/utils/requestUtils";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {
    formInstance = observable.box<Form>(null);

    static minimizable = true;

    headerLabel = () => {
        return 'Create Request'
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
            testID: TestIds.createRequest.form,
            cancel: {
                handler: async () => {
                    createRequestStore().clear();
                },
            },
            save: {
                handler: async () => {
                    let createdReq: HelpRequest;
        
                    try {
                        bottomDrawerStore().startSubmitting()
                        createdReq = await createRequestStore().createRequest()
                    } catch(e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    alertStore().toastSuccess(STRINGS.ACCOUNT.createdRequestSuccess(requestDisplayName(organizationStore().metadata.requestPrefix, createdReq.displayId)))
                    createRequestStore().clear()
                    bottomDrawerStore().hide()
                },
                label: 'Add',
                validator: () => {
                    return this.formInstance.get()?.isValid.get()
                }
            },
            bottomDrawerView: {
                minimizeLabel: this.headerLabel()
            },
        }

        return (
            <KeyboardAwareArea>
                <BackButtonHeader {...headerConfig} />
                <ScrollView testID={TestIds.createRequest.form} showsVerticalScrollIndicator={false}>
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
            testID: TestIds.createRequest.form,
            inputs: [
                
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
                        testID: TestIds.createRequest.inputs.description,
                        name: 'description',
                        icon: ICONS.request,
                        previewLabel: () => createRequestStore().notes,
                        headerLabel: () => 'Description',
                        placeholderLabel: () => 'Description',
                        type: 'TextArea',
                        required: true,
                    },
                    // Type of request
                    {
                        type: 'CategorizedItemList',
                        headerLabel: () => 'Type of request',
                        placeholderLabel: () => 'Type of request',
                        onSave: (type) => createRequestStore().type = categorizedItemsToRequestType(type),
                        val: () => {
                            return requestTypesToCategorizedItems(createRequestStore().type)
                        },
                        isValid: () => {
                            return createRequestStore().typeValid
                        },
                        testID: TestIds.createRequest.inputs.type,
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
                        onSave: (location) => createRequestStore().location = location,
                        val: () => {
                            return createRequestStore().location
                        },
                        isValid: () => {
                            return createRequestStore().locationValid
                        },
                        testID: TestIds.createRequest.inputs.location,
                        name: 'location',
                        previewLabel: () => createRequestStore().location?.address,
                        headerLabel: () => 'Location',
                        placeholderLabel: () => 'Location',
                        type: 'Map',
                        // required: true
                    },
                ],
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
                        testID: TestIds.createRequest.inputs.callStart,
                        name: 'callStart',
                        placeholderLabel: () => 'Call start',
                        type: 'TextInput',
                        icon: ICONS.timeCallStarted
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
                        testID: TestIds.createRequest.inputs.callEnd,
                        name: 'callEnd',
                        placeholderLabel: () => 'Call end',
                        type: 'TextInput',
                    },
                    // Caller Name
                    {
                        onChange: (callerName) => createRequestStore().callerName = callerName,
                        val: () => {
                            return createRequestStore().callerName
                        },
                        isValid: () => {
                            return true
                        },
                        testID: TestIds.createRequest.inputs.callerName,
                        name: 'callerName',
                        placeholderLabel: () => 'Caller name',
                        type: 'TextInput',
//                        icon: ICONS.callerContactInfo
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
                        testID: TestIds.createRequest.inputs.callerContactInfo,
                        name: 'callerContactInfo',
                        placeholderLabel: () => 'Caller contact info',
                        type: 'TextInput',
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
                    icon: ICONS.accountMultiple,
                    props: {
                        editPermissions: [PatchPermissions.RequestAdmin]
                    },
                    testID: TestIds.createRequest.inputs.positions,
                    name: 'positions',
                    type: 'Positions'
                },
                // Priority
                {
                    onSave: (priorities) => createRequestStore().priority = priorities[0],
                    val: () => {
                        return typeof createRequestStore().priority == 'number'
                            ? [createRequestStore().priority]
                            : []
                    },
                    isValid: () => {
                        return !!createRequestStore().priority 
                    },
                    testID: TestIds.createRequest.inputs.priority,
                    name: 'priority',
                    previewLabel: () => RequestPriorityToLabelMap[createRequestStore().priority],
                    headerLabel: () => 'Priority',
                    placeholderLabel: () => 'Priority',
                    type: 'List',
                    icon: createRequestStore().priority == 2 
                        ? ICONS.priority3
                        : createRequestStore().priority == 1
                            ? ICONS.priority2
                            : ICONS.priority1,
                    props: {
                        options: allEnumValues(RequestPriority),
                        optionToPreviewLabel: (opt) => RequestPriorityToLabelMap[opt]
                    },
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
                    icon: ICONS.tag,
                    testID: TestIds.createRequest.inputs.tags,
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
        return <Form sentry-label='CreateRequestForm' ref={this.setRef} {...this.formProps()}/>
    }
}

export default CreateHelpRequest
