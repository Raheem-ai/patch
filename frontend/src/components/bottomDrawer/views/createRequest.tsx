import React, { useRef } from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore, createRequestStore, alertStore, bottomDrawerStore } from "../../../stores/interfaces";
import { IComputedValue, reaction } from 'mobx';
import { observer } from "mobx-react";
import { resolveErrorMessage } from "../../../errors";
import { HelpRequest, RequestSkill, RequestSkillCategoryMap, RequestSkillCategoryToLabelMap, RequestSkillToLabelMap, RequestType, RequestTypeToLabelMap } from "../../../../../common/models";
import Form, { FormProps } from "../../forms/form";
import { allEnumValues } from "../../../../../common/utils";
import { FormInputConfig } from "../../forms/types";
import { ResponderCountRange } from "../../../constants";
import { BottomDrawerViewVisualArea } from "../../helpers/visualArea";
import { KeyboardAvoidingView, Platform } from "react-native";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {
    formInstance = React.createRef<Form>();
    componentDidMount = () => {
        // Set up reaction to monitor any time our form instance changes from the home page
        // or the header visibility changes.
        reaction(this.checkStateChange, this.checkHeaderShowing, {
                    equals: (a, b) => a[0] == b[0] && a[1] == b[1] && a[2] == b[2]
                });
    }
    
    static onHide = () => {
        console.log('createRequest.onHide');
        createRequestStore().clear();
    }

    static onShow = () => {
        // TO DO
        // If on form home page, show header
        // If on on sub page, hide header
        console.log('createRequest.onShow');
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
        // maybe need to track if it's minimized as well...
        // Return the current state of the form instance and header visibility
        return [this.formInstance?.current?.isHome.get(), bottomDrawerStore().headerShowing, bottomDrawerStore().expanded];
    }

    checkHeaderShowing = ([formIsHome, headerShowing, isExpanded]) => {
        console.log('Form Instance: %s', this.formInstance?.current);
        console.log('createRequest.checkHeaderShowing. formHomePage: %s. headerShowing: %s. isExpanded: %s', formIsHome, headerShowing, isExpanded);
        // If the form is on the home page the header should be showing.
        // If the form is anywhere but the home page, the header should not be showing, unless it's minimized.
        if (isExpanded && headerShowing && !formIsHome) {
            bottomDrawerStore().hideHeader();
        } else if (!isExpanded && !formIsHome && !headerShowing) {
            bottomDrawerStore().showHeader();
        }
    }

    formProps = (): FormProps => {
        return {
            headerLabel: this.headerLabel(), 
            onExpand: () => {
                console.log('createRequest.onExpand')
                bottomDrawerStore().hideHeader();
                // when: bottom drawer store is expanded and form is expanded
                // and bottom drawer view is this view, hide header.
            },
            onBack: () => {
                console.log('createRequest.onBack')
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
                            createRequestStore().skills.splice(idx, 1)
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
                            createRequestStore().type.splice(idx, 1)
                        },
                        dark: true
                    }
                }
            ] as [
                FormInputConfig<'TextArea'>,
                FormInputConfig<'Map'>, 
                FormInputConfig<'NestedTagList'>,
                FormInputConfig<'List'>,
                FormInputConfig<'TagList'>, 
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
