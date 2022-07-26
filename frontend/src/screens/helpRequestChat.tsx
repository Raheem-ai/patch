import { observer } from "mobx-react-lite";
import React from "react";
import ChatChannel from "../components/chats/chatChannel";
import { ScreenProps } from "../types";

type Props = ScreenProps<'HelpRequestChat'>;

const HelpRequestChat = observer(({ navigation, route }: Props) => {
    return (
        <ChatChannel />
    )
})

export default HelpRequestChat
