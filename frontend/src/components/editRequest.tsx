import React from "react";
import { IEditRequestStore, IRequestStore, IBottomDrawerStore, BottomDrawerHandleHeight } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import RequestForm from "./requestForm";

type Props = {}

@observer
class EditHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const editStore = getStore<IEditRequestStore>(IEditRequestStore);
        editStore.clear();
    }

    static submit = {
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const editStore = getStore<IEditRequestStore>(IEditRequestStore);
            const requestStore = getStore<IRequestStore>(IRequestStore);

            await editStore.editRequest(requestStore.currentRequest.id)
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
