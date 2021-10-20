import { observer } from "mobx-react-lite";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HeaderHeight } from "../components/header/header";
import UserIcon from "../components/userIcon";
import { useKeyboard } from "../hooks/useKeyboard";
import { IRequestStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { ScreenProps } from "../types";

type Props = ScreenProps<'HelpRequestChat'>;

const HelpRequestChat = observer(({ navigation, route }: Props) => {
    const userStore = getStore<IUserStore>(IUserStore);
    const requestStore = getStore<IRequestStore>(IRequestStore);
    const request = requestStore.currentRequest;
    const chat = request.chat;
    
    const dimensions = Dimensions.get('screen');
    const keyboardHeight = useKeyboard()

    const targetHeight = dimensions.height - HeaderHeight - keyboardHeight;

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<ScrollView>();

    useEffect(() => {
        Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => scrollRef?.current?.scrollToEnd({ animated: true }))
        });

        (async () => {
            await requestStore.updateChatReceipt(request);
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
                        const user = userStore.usersInOrg.get(message.userId); 
                        const isMe = message.userId == userStore.user.id;
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
            await requestStore.sendMessage(request, message)
            setLoading(false)
            setMessage('')

            setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 0)
        } catch (e) {
            console.error(e)
            setLoading(false)
        }
    }

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
})

export default HelpRequestChat

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
        padding: 12
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
    }
})