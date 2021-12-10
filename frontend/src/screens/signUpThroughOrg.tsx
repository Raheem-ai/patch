import { observer } from "mobx-react-lite";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { LinkExperience, LinkParams } from "../../../common/models";
import Form, { FormProps } from "../components/forms/form";
import { FormInputConfig } from "../components/forms/types";
import { resolveErrorMessage } from "../errors";
import { navigateTo } from "../navigation";
import { IAlertStore, IBottomDrawerStore, ILinkingStore, IUserStore } from "../stores/interfaces";
import { getStore } from "../stores/meta";
import { routerNames, ScreenProps } from "../types";

type Props = ScreenProps<'SignUpThroughOrg'>;

const SignUpThroughOrg = observer(({ navigation, route }: Props) => {

    const [pendingUser, setPendingUser] = useState<LinkParams[LinkExperience.SignUpThroughOrganization]>(null);
    // const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    // const [textAreaVal, setTextAreaVal] = useState('')
    const [nameVal, setNameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')

    useEffect(() => {
        (async () => {
            const linkingStore = getStore<ILinkingStore>(ILinkingStore);
            const params = route.params || linkingStore.initialRouteParams;

            setPendingUser(params)
        })();
    }, []);

    const config: FormProps = {
        headerLabel: 'Please verify that we have the correct email and provide your name and a password to finish signing up!', 
        inputs: [
            {
                val() {
                    return pendingUser?.email
                },
                name: 'email',
                previewLabel: () => pendingUser?.email,
                headerLabel: () => 'Email',
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
                previewLabel: () => nameVal,
                headerLabel: () => 'Name',
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
                previewLabel: () => passwordVal,
                headerLabel: () => 'Password',
                type: 'TextInput',
                required: true
            }
        ] as [
            FormInputConfig<'TextInput'>, 
            FormInputConfig<'TextInput'>, 
            FormInputConfig<'TextInput'>, 
            // FormInputConfig<'TagList'>
        ],
        submit: {
            handler: async () => {
                const userStore = getStore<IUserStore>(IUserStore);
                const alertStore = getStore<IAlertStore>(IAlertStore);

                try {
                    await userStore.signUpThroughOrg(pendingUser.orgId, pendingUser.pendingId, {
                        email: pendingUser.email,
                        password: passwordVal,
                        name: nameVal
                    })
                } catch(e) {
                    alertStore.toastError(resolveErrorMessage(e));
                    return
                }

                alertStore.toastSuccess(`Welcome to PATCH!`)

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