import { makeAutoObservable } from 'mobx';
import { Store } from './meta';
import { IFormStore } from './interfaces';

import CategorizedItemListInput from "../components/forms/inputs/screen/categorizedItemListInput";
import CategorizedItemListLabel from "../components/forms/inputs/labels/categorizedItemListLabel";
import DateTimeRangeInput from "../components/forms/inputs/inline/dateTimeRangeInput";
import ListInput from "../components/forms/inputs/screen/listInput";
import MapInput from "../components/forms/inputs/screen/mapInput";
import NestedListInput from "../components/forms/inputs/screen/nestedListInput";
import PermissionGroupListInput from "../components/forms/inputs/screen/permissionGroupListInput";
import PermissionGroupListLabel from "../components/forms/inputs/labels/permissionGroupListLabel";
import RecurringTimePeriodInput from "../components/forms/inputs/screen/recurringTimePeriodInput";
import RecurringTimePeriodLabel from "../components/forms/inputs/labels/recurringTimePeriodLabel";
import SwitchInput from "../components/forms/inputs/inline/switchInput";
import TagListLabel from "../components/forms/inputs/labels/tagListLabel";
import TextAreaInput from "../components/forms/inputs/screen/textAreaInput";
import TextInput from "../components/forms/inputs/inline/textInput";
import { FormInputViewMap } from "../components/forms/types";
import InlineListInput from "../components/forms/inputs/inline/inlineListInput";
import RoleListInput from "../components/forms/inputs/screen/roleListInput";
import PositionsInput from "../components/forms/inputs/screen/positionsInput";
import SliderInput from "../components/forms/inputs/inline/sliderInput";
import PositionsLabel from "../components/forms/inputs/labels/positionsLabel";
import RoleListLabel from "../components/forms/inputs/labels/roleListLabel";

@Store(IFormStore)
export default class FormStore implements IFormStore {

    inputViewMap: FormInputViewMap = {
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
            screenComponent: RoleListInput,
            labelComponent: RoleListLabel
        },
        'Positions': {
            screenComponent: PositionsInput,
            labelComponent: PositionsLabel,
            hideExpandArrow: true
        },
        'Slider': {
            inlineComponent: SliderInput
        }
    }

    viewStackCount = 0;

    get belowSurface() {
        return this.viewStackCount > 0
    }

    increaseDepth() {
        this.viewStackCount++
    }

    decreaseDepth() {
        this.viewStackCount--
    }

    clearDepth() {
        this.viewStackCount = 0
    }

    constructor() {
        makeAutoObservable(this, {
            inputViewMap: false // don't want to make the classes in this map observable
        })
    }

    clear() {
        
    }   
}