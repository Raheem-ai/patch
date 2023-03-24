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
import TestIds from "../../../test/ids";
import { rightNow } from "../../../../../common/utils";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {
    formInstance = observable.box<Form>(null);

    static onShow() {
        editRequestStore().loadRequest(requestStore().currentRequest.id);
    }

    headerLabel = () => {
        return STRINGS.REQUESTS.editRequestTitle(organizationStore().metadata.requestPrefix, requestStore().currentRequest.displayId) 
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
            testID: TestIds.editRequest.form,
            cancel: {
                handler: async () => {
                    // TODO: this should probably move to static onHide(){}
                    editRequestStore().clear();
                },
            },
            save: {
                handler: async () => {
                    try {
                        bottomDrawerStore().startSubmitting()
                        await editRequestStore().editRequest()
                    } catch (e) {
                        alertStore().toastError(resolveErrorMessage(e))
                        return
                    } finally {
                        bottomDrawerStore().endSubmitting()
                    }

                    const reqName = STRINGS.REQUESTS.requestDisplayName(
                        organizationStore().metadata.requestPrefix, 
                        requestStore().currentRequest.displayId
                    )

                    const successMsg = STRINGS.REQUESTS.updatedRequestSuccess(reqName)
        
                    alertStore().toastSuccess(successMsg)
        
                    bottomDrawerStore().hide()
                },
                label: STRINGS.INTERFACE.save,
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
            headerLabel: this.headerLabel, 
            homeScreen: this.formHomeScreen,
            testID: TestIds.editRequest.form,
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
                        testID: TestIds.editRequest.inputs.description,
                        name: 'description',
                        icon: ICONS.request,
                        previewLabel: () => editRequestStore().notes,
                        headerLabel: () => STRINGS.REQUESTS.description,
                        placeholderLabel: () => STRINGS.REQUESTS.description,
                        type: 'TextArea',
                        required: true
                    },
                    // Type of request
                    {
                        type: 'CategorizedItemList',
                        headerLabel: () => STRINGS.REQUESTS.requestType,
                        placeholderLabel: () => STRINGS.REQUESTS.requestType,
                        onSave: (type, diff) => {
                            // editRequestStore().type = categorizedItemsToRequestType(type)
                            editRequestStore().saveTypeUpdates({
                                addedItems: categorizedItemsToRequestType(diff.addedItems),
                                removedItems: categorizedItemsToRequestType(diff.removedItems)
                            })
                        },
                        val: () => {
                            return requestTypesToCategorizedItems(editRequestStore().type)
                        },
                        isValid: () => {
                            return editRequestStore().typeValid
                        },
                        testID: TestIds.editRequest.inputs.type,
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
                        testID: TestIds.editRequest.inputs.location,
                        name: 'location',
                        previewLabel: () => editRequestStore().location?.address,
                        headerLabel: () => STRINGS.REQUESTS.Location,
                        placeholderLabel: () => STRINGS.REQUESTS.Location,
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
                        testID: TestIds.editRequest.inputs.callStart,
                        name: 'callStart',
                        placeholderLabel: () => STRINGS.REQUESTS.callStart,
                        type: 'TextInput',
                        icon: ICONS.timeCallStarted,
                        props: {
                            inlineAction: {
                                icon: ICONS.timestamp,
                                action: () => runInAction(() => {editRequestStore().callStartedAt = rightNow()} )
                            }
                        }
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
                        testID: TestIds.editRequest.inputs.callEnd,
                        name: 'callEnd',
                        placeholderLabel: () => STRINGS.REQUESTS.callEnd,
                        type: 'TextInput',
                        props: {
                            inlineAction: {
                                icon: ICONS.timestamp,
                                action: () => runInAction(() => {editRequestStore().callEndedAt = rightNow()} )
                            }
                        }
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
                        testID: TestIds.editRequest.inputs.callerName,
                        name: 'callerName',
                        placeholderLabel: () => STRINGS.REQUESTS.callerName,
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
                        testID: TestIds.editRequest.inputs.callerContactInfo,
                        name: 'callerContactInfo',
                        placeholderLabel: () => STRINGS.REQUESTS.callerContactInfo,
                        type: 'TextInput',
                    },
                ],
                // Positions
                {
                    onSave: (data, diff) => {
                        // editRequestStore().positions = data
                        console.log('editRequest.tsx Diff: ', JSON.stringify(diff, null, 4))
                        editRequestStore().savePositionUpdates(diff)
                    },
                    val: () => {
                        return editRequestStore().positions;
                    },
                    isValid: () => true,
                    headerLabel: () => STRINGS.REQUESTS.positions,
                    placeholderLabel: () => STRINGS.REQUESTS.positions,
                    icon: ICONS.accountMultiple,
                    props: {
                        editPermissions: [PatchPermissions.RequestAdmin]
                    },
                    testID: TestIds.editRequest.inputs.positions,
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
                    testID: TestIds.editRequest.inputs.priority,
                    name: 'priority',
                    icon: editRequestStore().priority == 2 
                        ? ICONS.priority3 
                        : editRequestStore().priority == 1
                            ? ICONS.priority2
                            : ICONS.priority1,
                    previewLabel: () => RequestPriorityToLabelMap[editRequestStore().priority],
                    headerLabel: () => STRINGS.REQUESTS.priority,
                    placeholderLabel: () => STRINGS.REQUESTS.priority,
                    type: 'List',
                    props: {
                        options: allEnumValues(RequestPriority),
                        optionToPreviewLabel: (opt) => RequestPriorityToLabelMap[opt]
                    }
                },
                // Tags
                TagsListInput({
                    onSave: (items, diff) => {
                        // editRequestStore().tagHandles = items
                        editRequestStore().saveTagUpdates(diff)
                    },
                    val: () => {
                        return editRequestStore().tagHandles
                    },
                    isValid: () => {
                        return true
                    },
                    icon: ICONS.tag,
                    testID: TestIds.editRequest.inputs.tags,
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
