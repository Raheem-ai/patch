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

type Props = ScreenProps<'JoinOrganization'>;

const JoinOrganization = observer(({ navigation, route }: Props) => {

    const [pendingUser, setPendingUser] = useState<LinkParams[LinkExperience.JoinOrganization]>(null);
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

                // TO DO: add roles/roleIds
                try {
                    await userStore().joinOrganization(pendingUser.orgId, pendingUser.pendingId, {
                        email: pendingUser.email,
                        password: passwordVal.get(),
                        name: nameVal.get(),
                        roles: pendingUser.roles,
                    }
                    )
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

    const titleEmail = pendingUser
                ? ` for ${pendingUser.email}`
                : ``;
    const config: FormProps = {
        headerLabel: 'Add a name and password' + titleEmail, 
        inputs: [
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
            // InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>, 
            InlineFormInputConfig<'TextInput'>
            // FormInputConfig<'TagList'>
        ]
    }
    
    /* on staging, but in config: *********
    
    submit: {
            handler: async () => {
                try {
                    await userStore().joinOrganization(pendingUser.orgId, pendingUser.pendingId, {
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
            <BackButtonHeader {...headerProps} />
            <Form ref={setRef} {...config} />
        </>
    )

})

export default JoinOrganization

const styles = StyleSheet.create({
})