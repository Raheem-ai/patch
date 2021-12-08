// import { observer } from "mobx-react-lite";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { HelpRequest } from "../../../common/models";
import { HeaderHeight, InteractiveHeaderHeight } from "../components/header/header";
import UserIcon from "../components/userIcon";
import { useKeyboard } from "../hooks/useKeyboard";
import { BottomDrawerComponentClass, BottomDrawerHandleHeight, INativeEventStore, IRequestStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { ScreenProps } from "../types";

import { observer } from 'mobx-react'
import { observable } from "mobx";

type Props = {}
const dimensions = Dimensions.get('screen');

@observer
class HelpRequestChat extends React.Component<Props, { loading: boolean, message: string }> { 

    static onHide() {
        Keyboard.dismiss()
    }

    userStore = getStore<IUserStore>(IUserStore);
    requestStore = getStore<IRequestStore>(IRequestStore);
    nativeEventStore = getStore<INativeEventStore>(INativeEventStore);

    scrollRef = React.createRef<ScrollView>();

    state = {
        message: '',
        loading: false
    }

    async componentDidMount() {
        Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => this.scrollRef?.current?.scrollToEnd({ animated: true }))
        });

        await this.requestStore.updateChatReceipt(this.requestStore.currentRequest);
    }

    get chat() {
        return this.requestStore.currentRequest.chat;
    }

    messages = () => {
        if (!this.chat || !this.chat?.messages?.length) {
            return null
        }

        return (
            <ScrollView ref={this.scrollRef}>
                {
                    this.chat.messages.map((message) => {
                        const user = this.userStore.users.get(message.userId); 
                        const isMe = message.userId == this.userStore.user.id;
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

    sendMessage = async () => {
        this.setState({ loading: true })
        
        try {
            await this.requestStore.sendMessage(this.requestStore.currentRequest, this.state.message)
            // this.loading = false
            // this.message = ''
            this.setState({
                loading: false,
                message: ''
            })

            setTimeout(() => this.scrollRef.current.scrollToEnd({ animated: true }), 0)
        } catch (e) {
            console.error(e)
            // this.loading = false
            this.setState({ loading: false })

        }
    }

    updateMessage = (m: string) => {
        this.setState({ message: m })
    }

    render() {
        const targetHeight = dimensions.height - styles.inputContainer.height + (styles.inputContainer.padding * 2) - BottomDrawerHandleHeight - this.nativeEventStore.keyboardHeight;

        return (
            <KeyboardAvoidingView
                behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
                style={styles.chatContainer}>
                <View style={{ height: targetHeight }}>
                    <View style={styles.messagesContainer}>
                        { this.messages() }
                    </View>
                    <View style={styles.inputContainer}>
                        <IconButton 
                            disabled={this.state.loading}
                            icon='paperclip'
                            style={styles.inputAction}/>
                        <View style={styles.messageInputContainer} >
                            <TextInput 
                                multiline
                                autoFocus
                                value={this.state.message} 
                                style={styles.messageInput} 
                                onChangeText={this.updateMessage}/>
                        </View>
                        <IconButton 
                            disabled={this.state.loading}
                            onPress={this.sendMessage}
                            icon='send'
                            style={styles.inputAction}/>
                    </View>
                </View>
            </KeyboardAvoidingView>
        )
    }
}

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
        padding: 14,

    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        height: 78 // TODO: not sure why this is 78...should probably explicity specify input text/container height for this
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