import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, IAlertStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import RequestForm from "./requestForm";
import { resolveErrorMessage } from "../errors";
import { HelpRequest } from "../../../common/models";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
        createStore.clear();
    }

    static submit = {
        isValid: () => {
            const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
            return !!createStore.location && !!createStore.type.length && createStore.respondersNeeded != null
        },
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
            const alertStore = getStore<IAlertStore>(IAlertStore);
            
            let createdReq: HelpRequest;

            try {
                createdReq = await createStore.createRequest()
            } catch(e) {
                alertStore.toastError(resolveErrorMessage(e))
                return
            }

            alertStore.toastSuccess(`Successfully created request ${createdReq.displayId}`)

            bottomDrawerStore.hide()
        },
        label: 'Add'
    }

    static minimizeLabel = 'Create Request';

    createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
    requestStore = getStore<IRequestStore>(IRequestStore);

    headerLabel = () => {
        return 'Create Request'
    }
    
    render() {
        return <RequestForm headerLabel={this.headerLabel()} tempStore={this.createStore} />
    }
}

export default CreateHelpRequest
