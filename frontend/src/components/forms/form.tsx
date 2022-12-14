import React, { ComponentType } from "react";
import { Button, Text, IconButton } from 'react-native-paper';
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { observer } from "mobx-react";
import { computed, observable, runInAction } from "mobx";
import { FormInputConfig, InlineFormInputViewConfig, ScreenFormInputViewConfig, SectionScreenViewProps, SectionInlineViewProps, ScreenFormInputConfig, InlineFormInputConfig, SectionLabelViewProps, CompoundFormInputConfig, StandAloneFormInputConfig, NavigationFormInputConfig, ValidatableFormInputConfig, Grouped, AdHocScreenConfig } from "./types";
import { unwrap } from "../../../../common/utils";
import { Colors, ICONS } from "../../types";
import { formStore, nativeEventStore } from "../../stores/interfaces";
import { ScrollView } from "react-native-gesture-handler";
import { wrapScrollView } from "react-native-scroll-into-view";
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack";
import { NavigationContainer, NavigationState } from "@react-navigation/native";

const Stack = createStackNavigator();

export type FormProps = {
    inputs: Grouped<FormInputConfig>[] | (() => Grouped<FormInputConfig>[]),
    headerLabel?: string,
    onExpand?(): void,
    onBack?(): void,
    submit?: {
        label: string,
        handler: () => Promise<void>
    },
    homeScreen?: (params: CustomFormHomeScreenProps) => JSX.Element
    adHocScreens?: AdHocScreenConfig[]
    testID: string
}

export type CustomFormHomeScreenProps = {
    onSubmit: () => Promise<void>,
    onContainerPress: () => void,
    renderHeader: () => JSX.Element,
    renderInputs: (configsToRender: Grouped<StandAloneFormInputConfig>[]) => JSX.Element[],
    inputs: () => Grouped<StandAloneFormInputConfig>[],
    isValid: () => boolean,
    navigateToScreen: (screenName: string) => void,
}

const WrappedScrollView = wrapScrollView(ScrollView)

type GroupPosition = 'start' | 'middle' | 'end';

@observer
export default class Form extends React.Component<FormProps> {
    private homeScreenId = '__formHome';
    private requiredSuffix = ' (Required)';

    // used to flatten the (visually grouped) inputs into an interable list of all
    // standalone inputs so they can be processed easily
    private inputs = computed<StandAloneFormInputConfig[]>(() => {
        return this.flattenGroupedInputConfigs(this.groupedInputs.get())
    })

    private validatableInputs = computed<ValidatableFormInputConfig[]>(() => {
        return this.inputs.get().filter(i => {
            return !this.isNavigationInput(i)
        }) as ValidatableFormInputConfig[]
    })

    private navigationInputs = computed<NavigationFormInputConfig[]>(() => {
        return this.inputs.get().filter(i => {
            return this.isNavigationInput(i)
        }) as NavigationFormInputConfig[]
    })

    // used to unpack nested input configs from compound inputs (data based grouping) but keep them grouped
    // so they can be rendered correctly
    private groupedInputs = computed<Grouped<StandAloneFormInputConfig>[]>(() => {
        return this.expandCompoundInputConfigs(unwrap(this.props.inputs))
    })

    private screenInputs = computed<ScreenFormInputConfig[]>(() => {
        return this.inputs.get().filter((config: ScreenFormInputConfig) => {
            // TODO: probably should actually have this be cheking the type against the known types 
            // but then we need those values somewhere...this works for now 
            return !!config.onSave
        }) as ScreenFormInputConfig[]
    })

    // used to signal whether the form is submittable
    isValid = computed<boolean>(() => {
        return this.validatableInputs.get().filter(i => i.required).every(i => {
            const a = i.isValid()

            console.log(i.name, a)
            return a
        });
    })

    // use to externally signal that we are on the home screen of the form
    isHome = computed<boolean>(() => {
        return this.state.screenId == this.homeScreenId;
    })

    submitting = observable.box<boolean>(false)

    state = {
        screenId: this.homeScreenId
    }

    // type gaurd so compiler can use the result of this for type checking
    isNavigationInput = (config: StandAloneFormInputConfig): config is NavigationFormInputConfig =>  {
        // casting to one of the other input types to check if "type" property exists
        return !(config as InlineFormInputConfig).type
    }

    expandConfig = (config: FormInputConfig): StandAloneFormInputConfig[] => {

        const isCompoundInput = (config as any as CompoundFormInputConfig).inputs;

        if (isCompoundInput) {
            const nestedInputConfigs = (config as any as CompoundFormInputConfig).inputs?.()

            if (nestedInputConfigs && nestedInputConfigs.length) {
                const flattenedConfigs: StandAloneFormInputConfig[] = [];

                nestedInputConfigs.forEach(nestedConfig => {
                    flattenedConfigs.push(...this.expandConfig(nestedConfig))
                })

                return flattenedConfigs
            } else {
                return []
            }
        } else {
            return [
                config as StandAloneFormInputConfig
            ]
        }
    }

    expandCompoundInputConfigs = (inputConfigs: Grouped<FormInputConfig>[]): Grouped<StandAloneFormInputConfig>[] => {
        const expandedInputConfigs: Grouped<StandAloneFormInputConfig>[] = [];
        
        inputConfigs.forEach(config => {
            if (Array.isArray(config)) {
                const group: StandAloneFormInputConfig[] = []

                config.forEach(groupedConfig => {
                    group.push(...this.expandConfig(groupedConfig))
                });

                expandedInputConfigs.push(group);
            } else {
                const expandedConfig = this.expandConfig(config);
                expandedInputConfigs.push(...expandedConfig)
            }
        })

        return expandedInputConfigs
    }

    flattenGroupedInputConfigs = (inputConfigs: Grouped<StandAloneFormInputConfig>[]): StandAloneFormInputConfig[] => {
        const flattenedInputConfigs: StandAloneFormInputConfig[] = [];
        
        inputConfigs.forEach(config => {
            if (Array.isArray(config)) {
                flattenedInputConfigs.push(...config)
            } else {
                flattenedInputConfigs.push(config)
            }
        })

        return flattenedInputConfigs
    }
    
    listView = ({ navigation }: StackScreenProps<any>) => {

        const onPress = () => {
            if (nativeEventStore().keyboardOpen) {
                return Keyboard.dismiss()
            } 
        }

        const onSubmit = async () => {
            if (!this.isValid.get()) {
                return
            }

            this.submitting.set(true)

            try {
                await this.props.submit.handler()
            } finally {
                this.submitting.set(false)
            }
        }

        const navigateToScreenWithParams = (id: string, params?) => {
            navigation.navigate(id, params);
            this.props.onExpand?.()
        }

        const navigateToScreen = (id: string) => {
            navigateToScreenWithParams(id)
        }

        const renderInput = (inputConfig: StandAloneFormInputConfig, position?: GroupPosition) => {
            if (this.isNavigationInput(inputConfig)) {
                return <NavigationSection
                    sentry-label={inputConfig.name}        
                    // sentry-label={inputConfig.testID}
                            key={inputConfig.name}
                            inputConfig={inputConfig}
                            openLink={navigateToScreen}  
                            linkTo={inputConfig.name} 
                            groupPosition={position}/>
            } else {
            
                const viewConfig = formStore().inputViewMap[inputConfig.type];

                if (!viewConfig) {
                    throw `View config for input type: ${inputConfig.type} hasn't been set up`
                }

                // add required suffix to placholder labels by replacing the string or function in the config
                if (inputConfig.required) {
                    const placeholder = unwrap(inputConfig.placeholderLabel);

                    if (!placeholder.endsWith(this.requiredSuffix)) {

                        if (typeof inputConfig.placeholderLabel == 'function'){
                            const original = inputConfig.placeholderLabel;

                            inputConfig.placeholderLabel = () => original() + this.requiredSuffix
                        } else {
                            inputConfig.placeholderLabel += this.requiredSuffix
                        }  
                    }
                }

                // make sure any inline store updates are being run in an action 
                // (for convenience)
                const inlineInputConfig = inputConfig as InlineFormInputConfig;

                if (inlineInputConfig.onChange) {
                    const oldOnChange = inlineInputConfig.onChange;
                    
                    inlineInputConfig.onChange = (...args) => {
                        runInAction(() => {
                            return oldOnChange(...args)
                        })
                    }
                }

                const screenInputConfig = inputConfig as ScreenFormInputConfig;
                const screenViewConfig = viewConfig as ScreenFormInputViewConfig;

                const labelComponent = screenViewConfig.labelComponent || null

                if (labelComponent) {
                    return <LabelSection 
                        sentry-label={inputConfig.testID}
                        key={inputConfig.name}
                        inputConfig={screenInputConfig}
                        viewConfig={screenViewConfig}
                        labelComponent={labelComponent}
                        openLink={navigateToScreenWithParams}  
                        linkTo={inputConfig.name} 
                        groupPosition={position}/>
                }

                const inlineComponent = (viewConfig as InlineFormInputViewConfig).inlineComponent || null;

                if (inlineComponent) {    
                    return <InlineSection 
                        sentry-label={inputConfig.testID}
                        key={inputConfig.name}
                        inputConfig={inlineInputConfig}
                        inlineComponent={inlineComponent} 
                        groupPosition={position}/>
                }

                return <DefaultSection 
                    sentry-label={inputConfig.testID}
                    key={inputConfig.name}
                    inputConfig={screenInputConfig}
                    openLink={navigateToScreen}  
                    linkTo={inputConfig.name} 
                    groupPosition={position}/>
            }
        }

        const renderInputs = (configsToRender: Grouped<StandAloneFormInputConfig>[]) => {
            const inputElements: JSX.Element[] = [];

            // for component groups, render each individual component section with a groupPosition prop to allow for visually grouped components
            // ie LabelSection, InlineSection, DefaultSection need a new prop like groupPosition?: 'start' | 'middle' | 'end'
            configsToRender.forEach(inputConfig => {
                if (Array.isArray(inputConfig)) {

                    if (inputConfig.length == 1) {
                        inputElements.push(renderInput(inputConfig[0]));
                        return;
                    }

                    inputConfig.forEach((config, i) => {
                        const position: GroupPosition = i == 0
                            ? 'start'
                            : i == inputConfig.length - 1
                                ? 'end'
                                : 'middle'

                        inputElements.push(renderInput(config, position))
                    })
                } else {
                    inputElements.push(renderInput(inputConfig))
                }
            })

            return inputElements;
        }

        const renderHeader = () => {
            return this.props.headerLabel
                ? <View style={{
                    paddingLeft: 20,
                    borderStyle: 'solid',
                    borderBottomColor: Colors.borders.formFields,
                    borderBottomWidth: 1,
                    minHeight: 60,
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <Text style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                    }}>{this.props.headerLabel}</Text>
                </View>
                : null
        }

        // lets us customize how the home screen will look by passing the basic internal functions we use to 
        // render inputs on the home screen to a callback ie. if we want to have multiple form sections
        // spaced out with other ui around them but also have the whole page navigate back and forth between
        // the home screen and input screens 
        if (this.props.homeScreen) {
            const CustomHomeScreen = this.props.homeScreen;

            const customProps: CustomFormHomeScreenProps = {
                onSubmit,
                onContainerPress: onPress,
                renderHeader,
                renderInputs,
                inputs: () => this.groupedInputs.get(),
                isValid: () => this.isValid.get(),
                navigateToScreen
            };

            return (
                // TODO: might need this at the definitionof the custom home screen
                // ie pass it down?
                <CustomHomeScreen 
                    sentry-label={`${this.props.testID} (custom home screen)`} 
                    {...customProps} 
                />
            )
        }

        // where in the app does this get returned?
        return (
                <WrappedScrollView 
                    sentry-label={`${this.props.testID} (home screen)`}
                    testID={this.props.testID}
                    showsVerticalScrollIndicator={false} 
                    style={{ flex: 1 }}
                    contentContainerStyle={{ display: 'flex', flexGrow: 1 }} 
                    keyboardShouldPersistTaps='always' 
                    keyboardDismissMode='on-drag'>
                    <Pressable onPress={onPress} style={{ flex: 1, paddingBottom: 20 }}>
                        { renderHeader() }
                        { renderInputs(this.groupedInputs.get()) }
                        {
                            this.props.submit
                                ? <Button 
                                    sentry-label={`${this.props.testID} (submit button)`}
                                    uppercase={false}
                                    onPress={onSubmit}
                                    color={this.isValid.get() ? styles.submitButton.color : styles.disabledSubmitButton.color}
                                    icon='account-plus'
                                    disabled={!this.isValid.get()} 
                                    style={[styles.submitButton, !this.isValid.get() ? styles.disabledSubmitButton : null ]}>{this.props.submit.label}</Button>
                                : null
                        }
                    </Pressable>
                </WrappedScrollView>
        )
    }

    adHocScreen = (config: AdHocScreenConfig) => ({ navigation }: StackScreenProps<any>) => {
        const back = () => {
            navigation.goBack()
            this.props.onBack?.()
        }

        return config.screen({ back })
    }

    inputScreen = (inputConfig: ScreenFormInputConfig) => ({ navigation, route }: StackScreenProps<any>) => {
        const viewConfig = formStore().inputViewMap[inputConfig.type];

        const ScreenComponent: ComponentType<SectionScreenViewProps> = (viewConfig as ScreenFormInputViewConfig).screenComponent;
        
        if (ScreenComponent) {
            if (inputConfig.onSave) {
                const oldOnSave = inputConfig.onSave;
                
                inputConfig.onSave = (...args) => {
                    runInAction(() => {
                        return oldOnSave(...args)
                    })
                }
            }

            const back = () => {
                navigation.goBack()
                this.props.onBack?.()
                formStore().decreaseDepth()
            }

            const paramsFromLabel = route.params;

            return (
                <ScreenComponent
                    sentry-label={`${inputConfig.testID} (screen)`}
                    paramsFromLabel={paramsFromLabel} 
                    back={back} 
                    config={inputConfig}
                />
            )
        }
    }

    navigationScreen = (inputConfig: NavigationFormInputConfig) => ({ navigation }: StackScreenProps<any>) => { 
        const back = () => {
            navigation.goBack()
            this.props.onBack?.()
            formStore().decreaseDepth()
        }

        return inputConfig.screen({ back });
    }

    saveRoute = (state: NavigationState) => {
        const routeName = state?.routes[state?.index]?.name;

        this.setState({
            screenId: routeName
        })
    }

    render() {
        return (
            <NavigationContainer sentry-label={this.props.testID}  independent onStateChange={this.saveRoute}>
                <Stack.Navigator screenOptions={{ gestureEnabled: false, headerShown: false, cardStyle: { backgroundColor: Colors.backgrounds.standard }}}  initialRouteName={this.homeScreenId}>
                    {/* setup form home screen */}
                    <Stack.Screen name={this.homeScreenId} component={this.listView} />
                    {   // setup navigation input screen components
                        this.navigationInputs.get().map(navigationInputConfig => {
                            return (
                                <Stack.Screen 
                                    name={navigationInputConfig.name} 
                                    component={this.navigationScreen(navigationInputConfig)} 
                                />
                            )
                        })
                    }
                    {   // setup screen input screen components
                        this.screenInputs.get().map(screenInputConfig => {
                            return (
                                <Stack.Screen 
                                    name={screenInputConfig.name} 
                                    component={this.inputScreen(screenInputConfig)}
                                />
                            )
                        })
                    }
                    {
                        // setup ad-hoc screen components
                        (this.props.adHocScreens || []).map(config => {
                            return (
                                <Stack.Screen 
                                    name={config.name} 
                                    component={this.adHocScreen(config)}
                                />
                            )
                        })
                    }
                </Stack.Navigator>
            </NavigationContainer>
        )
    }
}

/**
 * Needs:
 * - to be able to specify the icon for a group of inputs/any of the inline/label components 
 *   from the config
 * 
 */

 const positionStyles = (pos: GroupPosition) => {
    switch (pos) {
        case 'start':
            return styles.startOfGroupSection
        case 'middle':
            return styles.middleOfGroupSection
        case 'end':
            return styles.endOfGroupSection
        default:
            return null;
    }
}

const DefaultSection = observer((props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    groupPosition?: GroupPosition
}) => {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        if (props.inputConfig.disabled) {
            return;
        }

        formStore().increaseDepth()
        props.openLink(props.linkTo);
    }

    const preview = unwrap(props.inputConfig.previewLabel)
    const placeHolder = unwrap(props.inputConfig.placeholderLabel)

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return preview 
            ? <>
                <Pressable 
                    sentry-label={props.inputConfig.testID}
                    testID={props.inputConfig.testID} 
                    style={resolvedStyles} 
                    onPress={expand}
                >
                    { props.inputConfig.icon
                        ? <View style={styles.iconContainer}>
                            <IconButton
                                icon={props.inputConfig.icon} 
                                color={Colors.icons.dark}
                                size={20} 
                                style={{ margin: 0, padding: 0, width: 20 }}
                                />
                        </View>
                        : null
                    }
                    <Text style={[styles.label, { flex: 1 }]}>{preview}</Text>
                    { !props.inputConfig.disabled
                        ? <IconButton
                            style={{ flex: 0, height: 30, width: 30, marginLeft: 20 }}
                            icon={ICONS.openListItem} 
                            color={Colors.icons.lighter}
                            onPress={expand}
                            size={30} />
                        : null
                    }
                </Pressable>
                {
                    partialBottomBorder
                        ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                        : null
                }
            </>
            : <>
                <Pressable 
                    sentry-label={props.inputConfig.testID} 
                    testID={props.inputConfig.testID} 
                    style={resolvedStyles} 
                    onPress={expand}
                >
                    { props.inputConfig.icon
                        ? <View style={styles.iconContainer}>
                            <IconButton
                                icon={props.inputConfig.icon} 
                                color={Colors.icons.dark}
                                size={20} 
                                style={{ margin: 0, padding: 0, width: 20 }}
                                />
                        </View>
                        : null
                    }
                    <Text style={[styles.label, styles.placeholder]}>{placeHolder || ''}</Text>
                    { !props.inputConfig.disabled
                        ? <IconButton
                            style={{ flex: 0, height: 30, width: 30 }}
                            icon={ICONS.openListItem}
                            color={Colors.icons.lighter}
                            onPress={expand}
                            size={30} />
                        : null
                    }
                </Pressable>
                {
                    partialBottomBorder
                        ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                        : null
                }
            </>
})

// doesn't need to be observer because inline components must be observers themselves 
function InlineSection(props: { 
    inputConfig: InlineFormInputConfig,
    inlineComponent: ComponentType<SectionInlineViewProps>,
    groupPosition?: GroupPosition
}) {
    const InlineComponent: ComponentType<SectionInlineViewProps> = props.inlineComponent;

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return (
        <>
            <View sentry-label={props.inputConfig.testID} style={resolvedStyles}>
                { props.inputConfig.icon
                    ? <View style={styles.iconContainer}>
                        <IconButton
                            icon={props.inputConfig.icon} 
                            color={Colors.icons.dark}
                            size={20} 
                            style={{ margin: 0, padding: 0, width: 20 }}
                            />
                    </View>
                    : null
                }
                <View style={{ flex: 1 }}>
                    <InlineComponent config={props.inputConfig}/>
                </View>
            </View>
            {
                partialBottomBorder
                    ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                    : null
            }
        </>
    )
}

const LabelSection = observer((props: { 
    inputConfig: ScreenFormInputConfig,
    linkTo: string,
    openLink: (screenId: string, params?: any) => void,
    groupPosition?: GroupPosition,
    labelComponent: ComponentType<SectionLabelViewProps>,
    viewConfig: ScreenFormInputViewConfig
}) => {

    const expand = (params?) => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        if (props.inputConfig.disabled) {
            return;
        }

        formStore().increaseDepth()
        props.openLink(props.linkTo, params);
    }

    const autoExpand = () => {
        if (props.viewConfig.disableAutoExpandFromLabel) {
            return
        }

        expand()
    }

    const Label: ComponentType<SectionLabelViewProps> = props.labelComponent;

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition)
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    return (
        <>
            <View sentry-label={props.inputConfig.testID} style={resolvedStyles}>
                { props.inputConfig.icon
                    ? <View style={styles.iconContainer}>
                        <IconButton
                            icon={props.inputConfig.icon} 
                            color={Colors.icons.dark}
                            size={20} 
                            style={{ margin: 0, padding: 0, width: 20 }}
                            />
                    </View>
                    : null
                }
                <View style={{ flex: 1 }}>
                    <Label config={props.inputConfig} expand={expand} />
                </View>
                { !props.inputConfig.disabled && !props.viewConfig.hideExpandArrow
                    ? <IconButton
                        style={{ flex: 0, height: 30, width: 30, alignSelf: 'flex-start', marginTop: 14 }}
                        icon={ICONS.openListItem}
                        color={Colors.icons.lighter}
                        onPress={autoExpand}
                        size={30} />
                    : null
                }
            </View>
            {
                partialBottomBorder
                    ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                    : null
            }
        </>
    )
})

const NavigationSection = observer((props: { 
    inputConfig: NavigationFormInputConfig,
    linkTo: string,
    openLink: (screenId: string) => void,
    groupPosition?: GroupPosition
}) => {

    const expand = () => {
        if (nativeEventStore().keyboardOpen) {
            return Keyboard.dismiss()
        } 

        if (props.inputConfig.disabled) {
            return;
        }

        formStore().increaseDepth()
        props.openLink(props.linkTo);
    }

    const resolvedExpand = () => {
        if (props.inputConfig.expandOverride) {
            props.inputConfig.expandOverride(expand)
        } else {
            expand()
        }
    }

    const resolvedStyles = [
        styles.section, 
        props.inputConfig.disabled 
            ? styles.disabledSection 
            : null,
        positionStyles(props.groupPosition),
        props.inputConfig.labelContainerStyle || null
    ]

    const partialBottomBorder = props.groupPosition == 'start' || props.groupPosition == 'middle';

    const rightIcon = props.inputConfig.expandIcon
        ? unwrap(props.inputConfig.expandIcon)
        : ICONS.openListItem

    return (
        <>
            <Pressable
                sentry-label={props.inputConfig.testID}
                testID={props.inputConfig.testID}
                style={resolvedStyles}
                onPress={resolvedExpand}
            >
                { props.inputConfig.icon
                    ? <View style={styles.iconContainer}>
                        <IconButton
                            icon={props.inputConfig.icon} 
                            color={Colors.icons.dark}
                            size={20} 
                            style={{ margin: 0, padding: 0, width: 20 }}
                            />
                    </View>
                    : null
                }
                {
                    typeof props.inputConfig.label == 'function'
                        ? <View style={{ flex: 1 }}>
                            { props.inputConfig.label({ expand: resolvedExpand, testID: props.inputConfig.testID }) }
                        </View>
                        : <Text style={[styles.label, { flex: 1 }]}>{props.inputConfig.label}</Text>
                }
                { !props.inputConfig.disabled
                    ? <IconButton
                        style={{ flex: 0, height: 30, width: 30 }}
                        icon={rightIcon} 
                        color={Colors.icons.lighter}
                        onPress={resolvedExpand}
                        size={30} />
                    : null
                }
            </Pressable>
            {
                partialBottomBorder
                    ? <View style={{ borderBottomColor : styles.section.borderBottomColor, borderBottomWidth: styles.section.borderBottomWidth, marginLeft: 60 }}/>
                    : null
            }
        </>
    )
})

const styles = StyleSheet.create({
    iconContainer: {
        height: 60,
        width: 60,
        position: 'absolute', 
        justifyContent: 'center',
        alignContent: 'center',
        alignSelf: 'flex-start',
        padding: 20
    },
    section: {
      minHeight: 60,
      borderStyle: 'solid',
      borderBottomColor: Colors.borders.formFields,
      borderBottomWidth: 1,
      alignItems: 'center',
      flexDirection: 'row',
      width: '100%',
      paddingLeft: 60,
    //   paddingRight: 20,
      justifyContent: 'space-between',
      position: 'relative'
    }, 
    startOfGroupSection: {
        borderBottomWidth: 0
    },
    middleOfGroupSection: {
        borderBottomWidth: 0,
        borderTopWidth: 0
    },
    endOfGroupSection: {
        borderTopWidth: 0
    },
    disabledSection: {
        // opacity: .5
        // backgroundColor: '#f6f6f6'
        // backgroundColor: '#E0DEE0'
    },
    placeholder: {
        color: Colors.text.forms.placeholder
    },
    label: {
        color: '#000',
        maxHeight: 120,
        paddingVertical: 12,
        lineHeight: 24,
        fontSize: 16
    },
    submitButton: {
        height: 48,
        borderRadius: 24,
        color: Colors.text.buttonLabelPrimary,
        backgroundColor: Colors.primary.alpha,
        justifyContent: 'center',
        margin: 20
    },
    disabledSubmitButton: {
        color: Colors.text.buttonLabelPrimary,
        backgroundColor: Colors.primary.delta,
    }
})