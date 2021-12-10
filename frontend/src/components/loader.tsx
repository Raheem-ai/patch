import React from "react";
import { ActivityIndicator } from "react-native-paper";
import { Colors } from "../types";


const Loader = () => <ActivityIndicator size={84} style={{ flex: 1 }} animating={true} color={Colors.secondary.alpha} />

export default Loader;