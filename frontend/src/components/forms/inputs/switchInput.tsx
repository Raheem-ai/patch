import { observer } from "mobx-react";
import React from "react";
import { View, Switch, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { unwrap } from "../../../../../common/utils";
import { Colors } from "../../../types";
import { SectionInlineViewProps } from "../types";

const SwitchInput = observer(({ config }: SectionInlineViewProps<'Switch'>) => {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.label, { flex: 1 }]}>{unwrap(config.props.label)}</Text>
            <Switch 
                style={{ marginHorizontal: 20 }}
                trackColor={{
                    true: Colors.primary.alpha
                }}
                disabled={config.disabled}
                value={config.val()}
                onValueChange={(v: boolean) => config.onChange?.(v)}
                />
        </View>
    )
})

export default SwitchInput;

const styles = StyleSheet.create({
    label: {
        color: '#000',
        maxHeight: 120,
        paddingVertical: 12,
        lineHeight: 24,
        fontSize: 16
    },
    notes: {
        flex: 1,
    }, 
    notesContainer: {
        flex: 1
    },
    disabled: {
        // opacity: .8,
    }
})