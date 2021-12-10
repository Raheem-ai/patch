import React from "react";
import { IEditRequestStore, IRequestStore, IBottomDrawerStore, BottomDrawerHandleHeight, IAlertStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import RequestForm from "./requestForm";
import { resolveErrorMessage } from "../errors";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const editStore = getStore<IEditRequestStore>(IEditRequestStore);
        editStore.clear();
    }

    static submit = {
        isValid: () => {
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            return !!editStore.location && !!editStore.type.length && editStore.respondersNeeded >= 0
        },
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            const requestStore = getStore<IRequestStore>(IRequestStore);
            const alertStore = getStore<IAlertStore>(IAlertStore);

            try {
                await editStore.editRequest(requestStore.currentRequest.id)
            } catch (e) {
                alertStore.toastError(resolveErrorMessage(e))
                return
            }

            alertStore.toastSuccess(`Successfully updated request ${requestStore.currentRequest.displayId}`)

            bottomDrawerStore.hide()
        },
        label: 'Save'
    }

    editStore = getStore<IEditRequestStore>(IEditRequestStore);
    requestStore = getStore<IRequestStore>(IRequestStore);

    async componentDidMount() {
        this.editStore.loadRequest(this.requestStore.currentRequest);
    }

    headerLabel = () => {
        return `Edit Request ${this.requestStore.currentRequest.displayId}`
    }
    
    render() {
        return <RequestForm headerLabel={this.headerLabel()} tempStore={this.editStore} />
    }
}

export default EditHelpRequest
