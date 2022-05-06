import CategorizedItemListInput from "./inputs/screen/categorizedItemListInput";
import CategorizedItemListLabel from "./inputs/labels/categorizedItemListLabel";
import DateTimeRangeInput from "./inputs/inline/dateTimeRangeInput";
import ListInput from "./inputs/screen/listInput";
import MapInput from "./inputs/screen/mapInput";
import NestedListInput from "./inputs/screen/nestedListInput";
import PermissionGroupListInput from "./inputs/screen/permissionGroupListInput";
import PermissionGroupListLabel from "./inputs/labels/permissionGroupListLabel";
import RecurringTimePeriodInput from "./inputs/screen/recurringTimePeriodInput";
import RecurringTimePeriodLabel from "./inputs/labels/recurringTimePeriodLabel";
import SwitchInput from "./inputs/inline/switchInput";
import TagListLabel from "./inputs/labels/tagListLabel";
import TextAreaInput from "./inputs/screen/textAreaInput";
import TextInput from "./inputs/inline/textInput";
import { FormInputViewMap } from "./types";
import InlineListInput from "./inputs/inline/inlineListInput";
import RoleListInput from "./inputs/screen/roleListInput";
import PositionsInput from "./inputs/screen/positionsInput";
import SliderInput from "./inputs/inline/sliderInput";

// TODO: the only way to remove a cycle and also allow input components to use 
// Form, is to have a FormStore return this 
export const FormViewMap: FormInputViewMap = {
    'TextArea': {
        screenComponent: TextAreaInput
    },
    'TextInput': {
        inlineComponent: TextInput
    }, 
    'List': {
        screenComponent: ListInput
    },
    'TagList': {
        screenComponent: ListInput,
        labelComponent: TagListLabel
    },
    // disabling this for now because it doesn't fully handle being 
    // an inline input ie. being disabled 
    // 'InlineList': {
    //     inlineComponent: InlineListInput
    // },
    'NestedList': {
        screenComponent: NestedListInput
    },
    'NestedTagList': {
        screenComponent: NestedListInput,
        labelComponent: TagListLabel
    },
    'Map': {
        screenComponent: MapInput
    },
    'DateTimeRange': {
        inlineComponent: DateTimeRangeInput
    },
    'RecurringTimePeriod': {
        screenComponent: RecurringTimePeriodInput,
        labelComponent: RecurringTimePeriodLabel
    },
    'Switch': {
        inlineComponent: SwitchInput
    },
    'PermissionGroupList': {
        labelComponent: PermissionGroupListLabel,
        screenComponent: PermissionGroupListInput
    }, 
    'CategorizedItemList': {
        screenComponent: CategorizedItemListInput,
        labelComponent: CategorizedItemListLabel
    },
    'RoleList': {
        screenComponent: RoleListInput
    },
    'Positions': {
        screenComponent: PositionsInput
    },
    'Slider': {
        inlineComponent: SliderInput
    }
}