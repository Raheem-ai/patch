import { observer } from "mobx-react-lite";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, IconButton, Text } from "react-native-paper";
import { PatchPermissions, RequestStatus } from "../../../../common/models";
import { requestStore, userStore } from "../../stores/interfaces";
import { iHaveAnyPermissions } from "../../utils";
import KeyboardAwareArea from "../helpers/keyboardAwareArea";
import UserIcon from "../userIcon";
import STRINGS from "../../../../common/strings";
import PatchButton from "../../components/patchButton";
import { ICONS, Colors } from "../../types";
import TestIds from "../../test/ids";

type Props =  {
    inTabbedScreen?: boolean
}

const RequestChatChannel = observer(({ inTabbedScreen }: Props) => {
    const request = requestStore().currentRequest;
    const chat = request.chat;

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const scrollRef = useRef<ScrollView>();

    const dimensions = Dimensions.get('screen');

    useEffect(() => {
        Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => scrollRef?.current?.scrollToEnd({ animated: true }))
        });

        (async () => {
            await requestStore().updateChatReceipt(request);
        })()
    }, [])

    const messages = () => {
        if (!chat || !chat?.messages?.length) {
            return null
        }

        return (
            <ScrollView ref={scrollRef} style={{height: '100%'}}>
                {
                    chat.messages.map((message) => {
                        const user = userStore().users.get(message.userId); 
                        const isMe = message.userId == userStore().user.id;
                        const bubbleWidth = dimensions.width - (styles.userIcon.marginHorizontal * 3) - styles.userIcon.width;

                        return (
                            <View style={[styles.messageRow, isMe ? styles.myMessageRow : null]}>
                                <UserIcon userId={message.userId} style={[styles.userIcon, isMe ? styles.myUserIcon : null]}/>
                                <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : null, { maxWidth: bubbleWidth }]}>
                                    <Text style={styles.messageText}>{message.message}</Text>
                                </View>
                            </View>
                        )
                    })
                }
            </ScrollView>
        )
    }

    const sendMessage = async () => {
        setLoading(true)
        
        try {
            await requestStore().sendMessage(request, message)
            setLoading(false)
            setMessage('')

            setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 0)
        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

    const enabledChat = () => {
        return (
            <KeyboardAwareArea insideTabView={inTabbedScreen} style={styles.chatContainer}>
                <View style={{ height: '100%' }}>
                    <View style={styles.messagesContainer}>
                        { messages() }
                    </View>
                    <View style={styles.inputContainer}>
                        {/*
                        <IconButton 
                            disabled={loading}
                            icon={ICONS.attachment}
                            style={styles.inputAction}/>
                        */}
                        <View style={styles.messageInputContainer} >
                            <TextInput 
                                testID={TestIds.requestChatChannel.textInput}
                                multiline
                                autoFocus
                                value={message} 
                                style={styles.messageInput} 
                                onChangeText={(s: string) => setMessage(s)}/>
                        </View>
                        <IconButton 
                            testID={TestIds.requestChatChannel.send}
                            sentry-label={TestIds.requestChatChannel.send}
                            disabled={loading}
                            onPress={sendMessage}
                            icon={ICONS.sendMessage}
                            style={styles.inputAction}/>
                    </View>
                </View>
            </KeyboardAwareArea>
        )
    }

    const reopenRequest = async () => {
        await requestStore().reopenRequest(requestStore().currentRequest.id);
    }

    const disabledChat = () => {
        // Keyboard.dismiss();

        const userIsRequestAdmin = iHaveAnyPermissions([PatchPermissions.RequestAdmin]);
        const userOnRequest = requestStore().currentRequest.positions.some(pos => pos.joinedUsers.includes(userStore().user.id));
        const userHasCloseRequestPermission = iHaveAnyPermissions([PatchPermissions.CloseRequests]);
        const userCanReopenRequest = userIsRequestAdmin || (userOnRequest && userHasCloseRequestPermission);

        const disabledActionAreaHeight = styles.openRequestButton.height + (2 * styles.inputContainer.padding)

        return (
            <View style={[styles.chatContainer, { paddingBottom: disabledActionAreaHeight }]}>
                { messages() }
                <View style={{ position: "absolute", left: 0, bottom: 0, borderTopColor: '#E0E0E0', borderTopWidth: 1 }}>
                    <View style={[styles.inputContainer, styles.disabledChatContainer, {flex: 0}]}>
                            {userCanReopenRequest 
                                ? <PatchButton 
                                    testID={TestIds.requestChatChannel.reopen}
                                    mode='outlined'
                                    uppercase={false}
                                    label={STRINGS.REQUESTS.TOGGLE.toggleRequest(false)}
                                    onPress={reopenRequest}/>
                                : <Text style={styles.disabledChatMessage}>{STRINGS.REQUESTS.requestIsClosed}</Text>
                            }
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={{ height: '100%' }}>
            { request.status == RequestStatus.Closed
              ? disabledChat()
              : enabledChat()
            }
        </View>
    )
})

export default RequestChatChannel

const styles = StyleSheet.create({
    chatContainer: {
        flex: 1,
        backgroundColor: '#fff'
    }, 
    messageInput: {
        // minHeight: 40,
        maxHeight: 140,
        backgroundColor: '#fff',
        margin: 0,
        padding: 0,
        paddingTop: 0,
        textAlignVertical: 'center'
    },
    messageInputContainer: {
        alignSelf: 'flex-end',
        flex: 1,
        borderRadius: 16,
        borderColor: '#666',
        borderStyle: 'solid',
        borderWidth: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        marginHorizontal: 12,
        justifyContent: 'center',
        padding: 14
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 20,
    }, 
    inputAction: {
        alignSelf: 'flex-end',
    },
    messagesContainer: {
        flex: 1,
    },
    messageRow: {
        flexDirection: 'row',
        direction: 'ltr',
        marginVertical: 12
    },
    myMessageRow: {
        direction: 'rtl'
    },
    userIcon: {
        marginHorizontal: 12,
        alignSelf: 'flex-end',
        width: 28,
        height: 28
    }, 
    myUserIcon: {
        display: 'none',
    },
    messageBubble: {
        alignSelf: 'flex-end',
        borderRadius: 12,
        borderBottomLeftRadius: 1,
        backgroundColor: Colors.backgrounds.medium,
        padding: 12,
        marginLeft: 2,
    }, 
    myMessageBubble: {
        backgroundColor: 'rgba(103, 49, 146, .2)',
        marginLeft: 12
    },
    messageText: {
        color: '#000'
    },
    disabledChatContainer: {
        justifyContent: 'center',
        backgroundColor: '#fff',
        width: '100%'
    },
    disabledChatMessage: {
        backgroundColor: '#fff',
        color: '#999799',
        fontWeight: '400',
        fontSize: 17
    },
    openRequestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderColor: '#76599A',
        borderStyle: 'solid',
        borderWidth: 1,
        borderRadius: 24,
        width: '100%',
        height: 48,
    }
})