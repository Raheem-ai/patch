import React from "react";
import { observer } from 'mobx-react'
import ChatChannel from "../../chats/chatChannel";

type Props = {}

@observer
class HelpRequestChat extends React.Component<Props, { loading: boolean, message: string }> { 
    render() {
        return (
            <ChatChannel bottomDrawerView={true}/>
        )
    }
}

export default HelpRequestChat
