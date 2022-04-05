import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore, createRequestStore, alertStore, bottomDrawerStore } from "../../../stores/interfaces";
import { IObservableValue, observable, reaction, runInAction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { DateTimeRange, HelpRequest, RecurringDateTimeRange, RecurringPeriod, RecurringTimeConstraints, RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../../../common/models";
import Form, { FormProps } from "../../forms/form";
import { allEnumValues, dateToDateString, dateToDayOfWeekString } from "../../../../../common/utils";
import { ScreenFormInputConfig } from "../../forms/types";
import { ResponderCountRange } from "../../../constants";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import { KeyboardAvoidingView, Platform } from "react-native";

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
                // Notes
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
                    previewLabel: () => createRequestStore().location?.address,
                    headerLabel: () => 'Location',
                    type: 'Map',
                    required: true
                },
                // Skills required
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
                    headerLabel: () => 'Skills required',
                    type: 'NestedTagList',
                    props: {
                        options: allEnumValues(RequestSkill),
                        categories: Object.keys(RequestSkillCategoryMap), 
                        optionToPreviewLabel: (opt) => RequestSkillToLabelMap[opt],
                        categoryToLabel: (cat) => RequestSkillCategoryToLabelMap[cat],
                        optionsFromCategory: (cat) => Array.from(RequestSkillCategoryMap[cat].values()),
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            runInAction(() => createRequestStore().skills.splice(idx, 1))
                        },
                    },
                },
                // Number of Responders
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
                    headerLabel: () => 'Number of responders',
                    type: 'List',
                    props: {
                        options: ResponderCountRange,
                        optionToPreviewLabel: (opt) => opt
                    },
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
                }
            ] as [
                ScreenFormInputConfig<'TextArea'>,
                ScreenFormInputConfig<'Map'>, 
                ScreenFormInputConfig<'NestedTagList'>,
                ScreenFormInputConfig<'List'>,
                ScreenFormInputConfig<'TagList'>, 
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
