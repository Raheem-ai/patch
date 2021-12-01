import React from "react";
import { ICreateRequestStore, IRequestStore, IBottomDrawerStore, BottomDrawerHandleHeight } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { observer } from "mobx-react";
import RequestForm from "./requestForm";

type Props = {}

@observer
class CreateHelpRequest extends React.Component<Props> {

    static onHide = () => {
        const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
        createStore.clear();
    }

    static submit = {
        action: async () => {
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
            const createStore = getStore<ICreateRequestStore>(ICreateRequestStore);
            
            await createStore.createRequest()
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
