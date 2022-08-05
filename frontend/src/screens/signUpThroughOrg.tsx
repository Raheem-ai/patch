import { observer } from "mobx-react-lite";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { LinkExperience, LinkParams } from "../../../common/models";
import STRINGS from "../../../common/strings";
import Form, { FormProps } from "../components/forms/form";
import { InlineFormInputConfig } from "../components/forms/types";
import { resolveErrorMessage } from "../errors";
import { navigateTo } from "../navigation";
import { alertStore, IAlertStore, ILinkingStore, IUserStore, linkingStore, userStore } from "../stores/interfaces";
import { routerNames, ScreenProps } from "../types";

type Props = ScreenProps<'SignUpThroughOrg'>;

const SignUpThroughOrg = observer(({ navigation, route }: Props) => {

    const [pendingUser, setPendingUser] = useState<LinkParams[LinkExperience.SignUpThroughOrganization]>(null);
    // const [textAreaVal, setTextAreaVal] = useState('')
    const [nameVal, setNameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')

    useEffect(() => {
        (async () => {
            const params = route.params || linkingStore().initialRouteParams;

            setPendingUser(params)
        })();
    }, []);

    const config: FormProps = {
        headerLabel: 'Please verify that we have the correct email and provide your name and a password to finish signing up!', 
        inputs: [
            {
                onChange: () => {},
                val() {
                    return pendingUser?.email
                },
                name: 'email',
                placeholderLabel: () => 'Email',
                isValid: () => {
                    return true
                },
                disabled: true,
                type: 'TextInput'
            },
            {
                onChange: setNameVal,
                val() {
                    return nameVal
                },
                isValid: () => {
                    return !!nameVal.length
                },
                name: 'name',
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                required: true
            },
            {
                onChange: setPasswordVal,
                val() {
                    return passwordVal
                },
                isValid: () => {
                    return !!passwordVal.length
                },
                name: 'password',
                placeholderLabel: () => 'Password',
                type: 'TextInput',
                required: true
            }
        ] as [
            InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>, 
            // FormInputConfig<'TagList'>
        ],
        submit: {
            handler: async () => {
                try {
                    await userStore().signUpThroughOrg(pendingUser.orgId, pendingUser.pendingId, {
                        email: pendingUser.email,
                        password: passwordVal,
                        name: nameVal
                    })
                } catch(e) {
                    alertStore().toastError({message: resolveErrorMessage(e)});
                    return
                }

                alertStore().toastSuccess({message: STRINGS.ACCOUNT.welcomeToPatch})

                navigateTo(routerNames.userHomePage)

            },
            label: 'Join us!'
        }
    }

    if (!pendingUser) {
        return null
    }
    
    return (
        <Form {...config}/>
    )

})

export default SignUpThroughOrg

const styles = StyleSheet.create({
    
})