// import { Platform, TextInput } from 'react-native';
import { TextProps } from "react-native";
import { Text } from "react-native-paper";


// if props aren't allowed in textprops, see if there's a better way to interface with react native paper's text props

export type SelectableTextProps = TextProps;

const SelectableText = (props: SelectableTextProps) => { 

    return(<Text 
        {...props}
        selectable={true}
        style={props.style}
        testID={props.testID}>
        {props.children}
        </Text>);
}

export default SelectableText; 

// const SelectableText = (props) => { 
    
//     if(Platform.OS === 'ios'){
//       // iOS requires a textinput for word selections
//         return(<TextInput
//             style={props.style}
//             testID={props.testID}
//             value={props.value}
//             editable={false}
//             multiline
//             />);
//     } else{
//         // Android can do word selections just with <Text>
//         return(<Text 
//             selectable={true}
//             style={props.style}
//             testID={props.testID}>
//             {props.value}
//             </Text>);
//     }
// }

// export default SelectableText; 