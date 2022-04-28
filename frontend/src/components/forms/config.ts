import CategorizedItemForm from "./categorizedItemForm";
import CategorizedItemListLabel from "./inputs/categorizedItemListLabel";
import DateTimeRangeInput from "./inputs/dateTimeRangeInput";
import ListInput from "./inputs/listInput";
import MapInput from "./inputs/mapInput";
import NestedListInput from "./inputs/nestedListInput";
import PermissionGroupListInput from "./inputs/permissionGroupList";
import PermissionGroupListLabel from "./inputs/permissionGroupListLabel";
import RecurringTimePeriodInput from "./inputs/recurringTimePeriodInput";
import RecurringTimePeriodLabel from "./inputs/recurringTimePeriodLabel";
import SwitchInput from "./inputs/switchInput";
import TagListLabel from "./inputs/tagListLabel";
import TextAreaInput from "./inputs/textAreaInput";
import TextInput from "./inputs/textInput";
import { FormInputViewMap } from "./types";

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
        screenComponent: CategorizedItemForm,
        labelComponent: CategorizedItemListLabel
    }
}