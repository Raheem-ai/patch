import { observer } from "mobx-react";
import React, { useEffect, useState,  } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { RequestSkill, RequestSkillToLabelMap, UserRole, UserRoleToLabelMap } from "../../../../../common/models";
import { allEnumValues } from "../../../../../common/utils";
import Form, { FormProps } from "../../../components/forms/form";
import { navigateTo } from "../../../navigation";
import { IBottomDrawerStore, ILinkingStore, INewUserStore, IUserStore } from "../../../stores/interfaces";
import { getStore } from "../../../stores/meta";
import { routerNames, ScreenProps } from "../../../types";
import { FormInputConfig } from "../../forms/types";


@observer
export default class AddUser extends React.Component {
    userStore = getStore<IUserStore>(IUserStore);
    linkingStore = getStore<ILinkingStore>(ILinkingStore);
    bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);
    newUserStore = getStore<INewUserStore>(INewUserStore);

    static submit = {
        action: async () => {
            const newUserStore = getStore<INewUserStore>(INewUserStore);
            const bottomDrawerStore = getStore<IBottomDrawerStore>(IBottomDrawerStore);

            const invited = await newUserStore.inviteNewUser()

            if (invited) {
                bottomDrawerStore.hide();
            }
        },
        label: () => {
            return `Send Invite`
        }
    }

    static onHide = () => {
        const newUserStore = getStore<INewUserStore>(INewUserStore);
        newUserStore.clear();
    }

    formProps = (): FormProps => {
        return {
            headerLabel: 'Invite a user to join your org by providing their email and phone number!', 
            onExpand: () => {
                this.bottomDrawerStore.hideHeader();
            },
            onBack: () => {
                this.bottomDrawerStore.showHeader();
            },
            inputs: [
                {
                    onChange: (email) => this.newUserStore.email = email,
                    val: () => {
                        return this.newUserStore.email
                    },
                    name: 'email',
                    previewLabel: () => this.newUserStore.email,
                    headerLabel: () => 'Email',
                    type: 'TextInput'
                },
                {
                    onChange: (phone) => this.newUserStore.phone = phone,
                    val: () => {
                        return this.newUserStore.phone
                    },
                    name: 'phone',
                    previewLabel: () => this.newUserStore.phone,
                    headerLabel: () => 'Phone',
                    type: 'TextInput'
                },
                {
                    onSave: (roles) => this.newUserStore.roles = roles,
                    val: () => {
                        return this.newUserStore.roles
                    },
                    name: 'roles',
                    previewLabel: () => null,
                    headerLabel: () => 'Roles',
                    type: 'TagList',
                    props: {
                        options: allEnumValues(UserRole),
                        optionToLabel: (opt) => UserRoleToLabelMap[opt],
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            this.newUserStore.roles.splice(idx, 1)
                        },
                    },
                },
                {
                    onSave: (skills) => this.newUserStore.skills = skills,
                    val: () => {
                        return this.newUserStore.skills
                    },
                    name: 'skills',
                    previewLabel: () => null,
                    headerLabel: () => 'Skills',
                    type: 'TagList',
                    props: {
                        options: allEnumValues(RequestSkill),
                        optionToLabel: (opt) => RequestSkillToLabelMap[opt],
                        multiSelect: true,
                        onTagDeleted: (idx: number, val: any) => {
                            this.newUserStore.skills.splice(idx, 1)
                        },
                        dark: true
                    },
                }
                
            ] as [
                FormInputConfig<'TextInput'>, 
                FormInputConfig<'TextInput'>, 
                FormInputConfig<'TagList'>,
                FormInputConfig<'TagList'>,
            ]
        }
    }

    render() {
        return (
            <View style={{ height: this.bottomDrawerStore.drawerContentHeight }}>
                <Form {...this.formProps()}/>
            </View>
        )
    }
                
}


const styles = StyleSheet.create({
    
})