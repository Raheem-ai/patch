import { observer } from "mobx-react-lite";
import React from "react";
import RequestChatChannel from "../components/chats/helpRequestChatChannel";
import { ScreenProps } from "../types";

type Props = ScreenProps<'HelpRequestChat'>;

const HelpRequestChat = observer(({ navigation, route }: Props) => {
    return (
        <RequestChatChannel />
    )
})

export default HelpRequestChat
