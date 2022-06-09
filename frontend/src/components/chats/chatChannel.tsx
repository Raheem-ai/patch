import { observer } from "mobx-react-lite";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { RequestStatus } from "../../../../common/models";
import { useKeyboard } from "../../hooks/useKeyboard";
import { BottomDrawerHandleHeight, requestStore, userStore } from "../../stores/interfaces";
import { HeaderHeight } from "../header/header";
import UserIcon from "../userIcon";

type Props =  {
    bottomDrawerView: boolean
}

const ChatChannel = observer(({ bottomDrawerView }: Props) => {
    const request = requestStore().currentRequest;
    const chat = request.chat;

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<ScrollView>();

    const dimensions = Dimensions.get('screen');
    const keyboardHeight = useKeyboard()
    // TODO: The calculation for the bottom drawer view chat channel has a couple of "magic" numbers.
    // Figure out more descriptive/meaningful variable names.
    const targetHeight = bottomDrawerView
                         ? dimensions.height - styles.disabledChatContainer.height + (styles.inputContainer.padding * 2) - BottomDrawerHandleHeight - keyboardHeight
                         : dimensions.height - HeaderHeight - keyboardHeight;


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
            <ScrollView ref={scrollRef}>
                {
                    chat.messages.map((message) => {
                        const user = userStore().users.get(message.userId); 
                        const isMe = message.userId == userStore().user.id;
                        const bubbleWidth = dimensions.width - (styles.userIcon.marginHorizontal * 3) - styles.userIcon.width;

                        return (
                            <View style={[styles.messageRow, isMe ? styles.myMessageRow : null]}>
                                <UserIcon user={user} style={styles.userIcon}/>
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
            <KeyboardAvoidingView
                behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
                style={styles.chatContainer}>
                <View style={{ height: targetHeight }}>
                    <View style={styles.messagesContainer}>
                        { messages() }
                    </View>
                    <View style={styles.inputContainer}>
                        <IconButton 
                            disabled={loading}
                            icon='paperclip'
                            style={styles.inputAction}/>
                        <View style={styles.messageInputContainer} >
                            <TextInput 
                                multiline
                                autoFocus
                                value={message} 
                                style={styles.messageInput} 
                                
                                onChangeText={(s: string) => setMessage(s)}/>
                        </View>
                        <IconButton 
                            disabled={loading}
                            onPress={sendMessage}
                            icon='send'
                            style={styles.inputAction}/>
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }

    const disabledChat = () => {
        Keyboard.dismiss();

        return (
            <View style={styles.chatContainer}>
                <View style={{ height: targetHeight }}>
                    <View style={styles.messagesContainer}>
                        { messages() }
                    </View>
                    <View style={[styles.inputContainer, styles.disabledChatContainer]}>
                        <Text style={styles.disabledChatMessage}>{'This request has been closed.'}</Text>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View>
            { request.status == RequestStatus.Closed
              ? disabledChat()
              : enabledChat()
            }
        </View>
    )
})

export default ChatChannel

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
        padding: 12,
    }, 
    inputAction: {
        alignSelf: 'flex-end',
    },
    messagesContainer: {
        flex: 1,
    },
    messageRow: {
        flexDirection: 'row',
        direction: 'rtl',
        marginVertical: 12
    },
    myMessageRow: {
        direction: 'ltr'
    },
    userIcon: {
        marginHorizontal: 12,
        alignSelf: 'flex-end',
        width: 28,
        height: 28
    }, 
    messageBubble: {
        alignSelf: 'flex-end',
        borderRadius: 16, 
        backgroundColor: 'rgba(179, 214, 226, .5)',
        padding: 12,
    }, 
    myMessageBubble: {
        backgroundColor: 'rgba(103, 49, 146, .2)'
    },
    messageText: {
        color: '#000'
    },
    disabledChatContainer: {
        justifyContent: 'center',
        height: 80, // TODO: not sure why this is 80...should probably explicity specify input text/container height for this
        backgroundColor: '#fff',
        borderColor: '#666',
        borderStyle: 'solid',
        borderTopWidth: 1,
        width: '100%'
    },
    disabledChatMessage: {
        backgroundColor: '#fff',
        color: '#999799',
        fontWeight: '400',
        fontSize: 17
    }
})