import { observer } from "mobx-react";
import React, { useState } from "react";
import { Dimensions, KeyboardAvoidingView, Platform, View, TextInput as RNTextInput, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { List } from "react-native-paper";
import { useKeyboard } from "../../../../hooks/useKeyboard";
import { HeaderHeight } from "../../../header/header";
import { SectionScreenViewProps } from "../../types";
import BackButtonHeader, { BackButtonHeaderProps } from "../backButtonHeader";
import InlineListInput, { InlineListInputProps } from "../inline/inlineListInput";

export type ListInputProps = SectionScreenViewProps<'List' | 'TagList'>;

const ListInput = observer(({ 
    back, 
    config,
}: ListInputProps) => {

    const [vals, setVals] = useState(config.val())

    const save = () => {
        config.onSave(Array.from(vals.values()));
        back();
    }

    const headerProps: BackButtonHeaderProps = {
        cancel: {
            handler: () => {
                config.onCancel?.()
                back()
            }
        },
        save: {
            handler: save,
        },
        label: config.headerLabel,
        bottomBorder: true
    }

    const inlineListConfig: InlineListInputProps = {
        config: {
            val: () => vals,
            onChange: setVals,
            isValid: config.isValid,
            type: 'InlineList',
            name: 'inlineList',
            props: config.props
        }
    }

    return (
        <>
            <BackButtonHeader  {...headerProps} /> 
            <InlineListInput {...inlineListConfig}/>
        </>
    )
})

export default ListInput;