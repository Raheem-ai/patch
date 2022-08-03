import React, { useEffect, useState,  } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { LinkExperience, LinkParams } from "../../../common/models";
import Form, { FormProps } from "../components/forms/form";
import { InlineFormInputConfig } from "../components/forms/types";
import { resolveErrorMessage } from "../errors";
import { navigateTo } from "../navigation";
import { alertStore, IAlertStore, ILinkingStore, IUserStore, linkingStore, userStore } from "../stores/interfaces";
import { routerNames, ScreenProps } from "../types";

type Props = ScreenProps<'SignUpThroughOrg'>;

const SignUpThroughOrg = ({ navigation, route }: Props) => {

    const [pendingUser, setPendingUser] = useState<LinkParams[LinkExperience.SignUpThroughOrganization]>(null);
    const [nameVal, setNameVal] = useState('');
    const [passwordVal, setPasswordVal] = useState('');

    useEffect(() => {
        (async () => {
            const params = route.params || linkingStore().initialRouteParams;
            setPendingUser(params);
        })();
    }, []);

    /*
    const emailInput: InlineFormInputConfig<'TextInput'> = {
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
    }
    const nameInput: InlineFormInputConfig<'TextInput'> = {
        val: () =>  nameVal,
        onChange: (val) => setNameVal(val),
        isValid: () => !!nameVal,
        placeholderLabel: () => 'Name',
        type: 'TextInput',
        name: 'name',
        required: true
    }
    const passwordInput: InlineFormInputConfig<'TextInput'> = {
        val: () =>  passwordVal,
        onChange: (val) => setPasswordVal(val),
        isValid: () => !!passwordVal,
        placeholderLabel: () => 'Password',
        type: 'TextInput',
        name: 'password',
        required: true
    }
    */

    const config: FormProps = {
        headerLabel: 'Add your name and a password', 
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
                val: () =>  null,
                onChange: (currentVal) => setNameVal(currentVal),
                isValid: () => !!nameVal,
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                name: 'name',
                required: true
            },
            {
                val: () =>  null,
                onChange: (currentVal) => setPasswordVal(currentVal),
                isValid: () => !!passwordVal,
                placeholderLabel: () => 'Password',
                type: 'TextInput',
                name: 'password',
                required: true,
            }
        ] as [
            InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>
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
                    alertStore().toastError(resolveErrorMessage(e));
                    return
                }

                alertStore().toastSuccess(`Welcome to PATCH!`)

                navigateTo(routerNames.userHomePage)

            },
            label: 'Join us!'
        }
    }

    if (!pendingUser) {
        return null
    }


    return (
        <Form {...config} />
    )

}

export default SignUpThroughOrg

const styles = StyleSheet.create({
})