import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text, TextInput } from "react-native-paper";
import { LinkExperience, LinkParams } from "../../../common/models";
import STRINGS from "../../../common/strings";
import Form, { FormProps } from "../components/forms/form";
import BackButtonHeader, { BackButtonHeaderProps } from "../components/forms/inputs/backButtonHeader";
import { InlineFormInputConfig } from "../components/forms/types";
import { resolveErrorMessage } from "../errors";
import { navigateTo } from "../navigation";
import { alertStore, IAlertStore, ILinkingStore, IUserStore, linkingStore, userStore } from "../stores/interfaces";
import { routerNames, ScreenProps } from "../types";

type Props = ScreenProps<'SignUpThroughOrg'>;

const SignUpThroughOrg = observer(({ navigation, route }: Props) => {

    const [pendingUser, setPendingUser] = useState<LinkParams[LinkExperience.SignUpThroughOrganization]>(null);
    const [nameVal] = useState(observable.box(''));
    const [passwordVal, setPasswordVal] = useState(observable.box(''));
    const [formInstance] = useState(observable.box<Form>(null));

    const setRef = (formRef: Form) => {
        runInAction(() => {
            formInstance.set(formRef)
        })
    };

    useEffect(() => {
        (async () => {
            const params = route.params || linkingStore().initialRouteParams;
            setPendingUser(params);
        })();
    }, []);

    const headerProps: BackButtonHeaderProps = {
        save: {
            handler: async () => {
                try {
                    await userStore().signUpThroughOrg(pendingUser.orgId, pendingUser.pendingId, {
                        email: pendingUser.email,
                        password: passwordVal.get(),
                        name: nameVal.get()
                    })
                } catch(e) {
                    alertStore().toastError(resolveErrorMessage(e));
                    return
                }

                alertStore().toastSuccess(`Welcome to PATCH!`)

                navigateTo(routerNames.userHomePage)
            },
            validator: () => {
                return formInstance.get()?.isValid.get()
            },
            label: 'Join'
        },
        bottomBorder: true, 
    }

    const config: FormProps = {
        headerLabel: 'Add your name and a password to sign up', 
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
                val: () => nameVal.get(),
                onChange: (currentVal) => {
                    nameVal.set(currentVal);
                },
                isValid: () => !!nameVal.get(),
                placeholderLabel: () => 'Name',
                type: 'TextInput',
                name: 'name',
                required: true
            },
            {
                val: () =>  passwordVal.get(),
                onChange: (currentVal) => passwordVal.set(currentVal),
                isValid: () => !!passwordVal.get(),
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
        ]
    }
    
    /* on staging, but in config: *********
    
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

                alertStore().toastSuccess(STRINGS.ACCOUNT.welcomeToPatch)

                navigateTo(routerNames.userHomePage)

            },
            label: 'Join us!'
        }
        
        ********* */

    if (!pendingUser) {
        return null
    }


    return (
        <>
            <View style={{height:36}}></View>
            <BackButtonHeader {...headerProps} />
            <Form ref={setRef} {...config} />
        </>
    )

})

export default SignUpThroughOrg

const styles = StyleSheet.create({
})