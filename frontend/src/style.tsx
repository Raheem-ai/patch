import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    title: {
        fontSize: 25,
        fontWeight: "bold",
        textAlign: "center",
    },
    button: {
        color: "#000",
        textAlign: "center",
        textDecorationColor: "#fff",
    },
    fitToText: {
        flexDirection: "row",
        justifyContent: "space-evenly",
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    containerTest: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 15,
    },
    spacing: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
});