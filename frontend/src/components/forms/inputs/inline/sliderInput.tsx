import { computed, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { View, StyleSheet, ViewStyle, Pressable, GestureResponderEvent, LayoutChangeEvent, TextStyle } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../../../types";
import { SectionInlineViewProps } from "../../types";

const MORE = -1;

enum Knobs {
    Min,
    Max
}

// store outside observer for when you go in and out of editing a position
let areInverted = null;

@observer
class SliderInput extends React.Component<SectionInlineViewProps<'Slider'>>{
    private knobOffset = (styles.knob.width / 2);
    private maxBeforeOrMore = this.props.config.props?.maxBeforeOrMore;
    private steps = this.maxBeforeOrMore + 1;

    // TODO: not sure this one needs to be an observable
    private minMax = observable.box(this.props.config.val() || { min: 0, max: MORE });
    // need to know width of the container we're in...this is just where we store it
    private width = observable.box(0);

    private minKnobLeft = observable.box(0);
    private maxKnobLeft = observable.box(0);
    private touchStartX = observable.box(0);

    // when the knobs cross, the last one being dragged should always be on top
    private topKnob = observable.box<Knobs>(null);
    
    // when knobs cross, their labels and value they give to onChange 
    // need to swap
    // private knobsInverted = observable.box(areInverted ? areInverted : false);
    private knobsInverted = observable.box(false);
    
    // check if values are the same when we're initialized
    // otherwise this gets set when the min/max values change
    private isExact = observable.box((() => {
        const val = this.props.config.val();

        return val
            // protect against min being passed as -1
            ? val.max == val.min && val.min >= 0
            : false
    })());

    // TODO: these two are just needed for the initial value
    // should probably just be a regular variable
    get min() {
        return this.minMax.get().min
    }

    get max() {
        return this.minMax.get().max
    }

    get isExactValue() {
        return this.isExact.get()
    }

    get minKnobValue() {
        return this.leftXToValue(this.minKnobLeft.get());
    }
        
    get maxKnobValue() { 
        return this.leftXToValue(this.maxKnobLeft.get());
    }

    get minIsOnTop() { 
        return this.topKnob.get() == Knobs.Min
    }
    
    get maxIsOnTop() { 
        return this.topKnob.get() == Knobs.Max
    }

    stepWidth = (width?: number) => {
        return ((width || this.width.get())) / this.steps
    };


    initialMinKnobLeft = (width: number) => {
        return this.min <= 0
            ? -this.knobOffset
            : (this.min * this.stepWidth(width)) - this.knobOffset 
    }

    initialMaxKnobLeft = (width: number) => {
        return (this.max == MORE) 
            ? this.width.get() - this.knobOffset
            : ((this.max) * this.stepWidth(width)) - this.knobOffset
    }

    leftXToStep = (x: number) => {
        const val = Math.floor((x + this.knobOffset) / this.stepWidth())
        
        const resolvedVal =  val < 0
            ? 0
            : val > this.maxBeforeOrMore + 1
                ? this.maxBeforeOrMore + 1
                : val;

        return resolvedVal;
    }

    leftXToValue = (x: number) => {
        const step = this.leftXToStep(x)
        return this.stepToValue(step)
    }

    stepToValue = (step: number) => {
        return step > this.maxBeforeOrMore
            ? MORE
            : step;
    }

    stepCenter = (step: number) => {
        return step * this.stepWidth()
    }

    stepLeft = (step: number) => {
        return this.stepCenter(step) - this.knobOffset
    }

    boundsOverlap = (updated: [number, number], other: [number, number]) => {
        return (updated[0] <= other[0] && updated[1] >= other[0])
            || (updated[0] >= other[0] && updated[0] <= other[1]);
    }

    rangeKnobs = () => {
        const onTouchMove = (isMin: boolean) => (event: GestureResponderEvent) => {
            const delta = event.nativeEvent.locationX - this.touchStartX.get();
            
            runInAction(() => {
                if (isMin) {
                    this.topKnob.set(Knobs.Min)

                    const updatedMinLeft = this.minKnobLeft.get() + delta;

                    const bound = this.knobsInverted.get()
                        ? this.width.get() - this.knobOffset
                        : -this.knobOffset;

                    const insideBounds = this.knobsInverted.get()
                        ? updatedMinLeft < bound // upper bound
                        : updatedMinLeft > bound // lower bound
                    
                    // update left by drag delta or clamp at lower bound
                    if (!insideBounds){
                        this.minKnobLeft.set(bound);
                    } else {
                        this.minKnobLeft.set(updatedMinLeft)
                    }
                } else {
                    this.topKnob.set(Knobs.Max)

                    const updatedMaxLeft = this.maxKnobLeft.get() + delta

                    const bound = this.knobsInverted.get()
                        ? -this.knobOffset
                        : this.width.get() - this.knobOffset

                    const insideBounds = this.knobsInverted.get()
                        ? updatedMaxLeft > bound // lower bound
                        : updatedMaxLeft < bound // upper bound

                    // update left by drag delta or clamp at upper bound
                    if (!insideBounds){
                        this.maxKnobLeft.set(bound);
                    } else {
                        this.maxKnobLeft.set(updatedMaxLeft)
                    }
                }

                this.knobsInverted.set(this.minKnobLeft.get() > this.maxKnobLeft.get())
                // keep global in sync
                areInverted = this.knobsInverted.get();
            })

        }

        const onTouchEnd = (isMin: boolean) => (event: GestureResponderEvent) => {
            const delta = event.nativeEvent.locationX - this.touchStartX.get();
            
            runInAction(() => {
                if (isMin) {
                    const step = this.leftXToStep(this.minKnobLeft.get() + delta)
                    const valueToSet = this.stepToValue(step);
                    const stepLeft = this.stepLeft(step);
                    this.minKnobLeft.set(stepLeft)

                    if (valueToSet == this.maxKnobValue) {
                        this.isExact.set(true)
                    }

                     // need to consider inverted
                    this.props.config.onChange({ 
                        max: areInverted
                        ? valueToSet
                        : this.maxKnobValue > this.maxBeforeOrMore 
                            ? MORE 
                            : this.maxKnobValue, 
                        min: areInverted
                        ? this.maxKnobValue
                        : valueToSet 
                    })
                } else {
                    const step = this.leftXToStep(this.maxKnobLeft.get() + delta)
                    const valueToSet = this.stepToValue(step);
                    const stepLeft = this.stepLeft(step);
                    this.maxKnobLeft.set(stepLeft)

                    if (valueToSet == this.minKnobValue) {
                        this.isExact.set(true)
                    }

                    // need to consider inverted
                    this.props.config.onChange({ 
                        min: areInverted
                        ? valueToSet
                        : this.minKnobValue, 
                        max: areInverted
                        ? this.minKnobValue
                        : valueToSet > this.maxBeforeOrMore 
                            ? MORE 
                            : valueToSet 
                    })
                }
            })
        }

        const inverted = this.knobsInverted.get();

        /* Not sure what the outer ternary is for here
        const minKnobLabel = inverted
            ? `${this.minKnobValue == MORE ? '+' : this.minKnobValue}`
            : `${this.minKnobValue}`;

        const maxKnobLabel = inverted
            ? `${this.maxKnobValue}`
            : `${this.maxKnobValue == MORE ? '+' : this.maxKnobValue}`;
        */

        const minKnobLabel = `${this.minKnobValue == MORE ? '+' : this.minKnobValue}`;
        const maxKnobLabel = `${this.maxKnobValue == MORE ? '+' : this.maxKnobValue}`;

        return this.knobs({
            min: {
                label: minKnobLabel,
                onTouchMove: onTouchMove(true),
                onTouchEnd: onTouchEnd(true)
            },
            max: {
                label: maxKnobLabel,
                onTouchMove: onTouchMove(false),
                onTouchEnd: onTouchEnd(false)
            }
        })
    }

    stepBar = () => {
        const maxLeft = this.maxKnobLeft.get()
        const minLeft = this.minKnobLeft.get()

        const lowerBound = Math.min(maxLeft, minLeft)
        const upperBound = Math.max(maxLeft, minLeft);

        const innerWidth = upperBound - lowerBound;
        const left = lowerBound + this.knobOffset;

        return (
            <View style={{ 
                width: '100%', 
                height: styles.step.height, 
                backgroundColor: styles.outOfRange.backgroundColor 
            }}>
                <View style={{ 
                    width: innerWidth, 
                    left, 
                    position: 'absolute', 
                    height: styles.step.height, 
                    backgroundColor: styles.inRange.backgroundColor 
                }}/>
            </View>
        )
    }

    exactKnobs = () => {

        const onTouchMove = (event: GestureResponderEvent) => {
            const delta = event.nativeEvent.locationX - this.touchStartX.get();
            
            runInAction(() => {
                if (delta > 0) {
                    // pull max open
                    if (this.minIsOnTop) {
                        this.knobsInverted.set(true);
                        this.minKnobLeft.set(this.minKnobLeft.get() + delta)
                    } else {
                        this.maxKnobLeft.set(this.maxKnobLeft.get() + delta)
                    }
                } else {
                    // pull min open
                    if (this.maxIsOnTop) {
                        this.knobsInverted.set(true);
                        this.maxKnobLeft.set(this.maxKnobLeft.get() + delta)
                    } else {
                        this.minKnobLeft.set(this.minKnobLeft.get() + delta)
                    }
                }

                this.isExact.set(false)
            })
            
        }

        const onTouchEnd = (event: GestureResponderEvent) => {

        }
        const exactLabel = `${this.maxKnobValue == MORE ? '+' : this.maxKnobValue}`;

        return this.knobs({
            min: {
                label: `${exactLabel}`,
                onTouchMove: onTouchMove,
                onTouchEnd: onTouchEnd
            },
            max: {
                label: `${exactLabel}`,
                onTouchMove: onTouchMove,
                onTouchEnd: onTouchEnd
            }
        })
    }

    knobs = (config: {
        min: {
            label: string,
            onTouchMove: (event: GestureResponderEvent) => void,
            onTouchEnd: (event: GestureResponderEvent) => void
        },
        max: {
            label: string,
            onTouchMove: (event: GestureResponderEvent) => void,
            onTouchEnd: (event: GestureResponderEvent) => void
        }
    }) => {

        const onTouchStart = (event: GestureResponderEvent) => {
            this.touchStartX.set(event.nativeEvent.locationX)
        }

        const onTouchEnd = (isMin: boolean) => (event: GestureResponderEvent) => {
            runInAction(() => {
                if (isMin) {
                    config.min.onTouchEnd(event)
                } else {
                    config.max.onTouchEnd(event)
                }
                
                this.touchStartX.set(0)
            })
        }

        return (
            <>
                <Pressable 
                    key='min' 
                    style={[styles.knob, { left: this.minKnobLeft.get(), zIndex: this.minIsOnTop ? 10 : 1 }]}
                    onTouchStart={onTouchStart}
                    onTouchMove={config.min.onTouchMove}
                    onTouchEnd={onTouchEnd(true)}
                >
                    <Text style={{ color: styles.knob.color }}>{config.min.label}</Text>
                    {
                        this.isExactValue && this.minIsOnTop
                            ? this.exactKnobDecorations()
                            : null
                    }
                </Pressable>
                <Pressable 
                    key='max' 
                    style={[styles.knob, { left: this.maxKnobLeft.get(), zIndex: this.maxIsOnTop ? 10 : 1  }]}
                    onTouchStart={onTouchStart}
                    onTouchMove={config.max.onTouchMove}
                    onTouchEnd={onTouchEnd(false)}
                >
                    <Text style={[{ color: styles.knob.color }, this.maxKnobValue == MORE ? styles.more : null ]}>{config.max.label}</Text>
                    {
                        this.isExactValue && this.maxIsOnTop
                            ? this.exactKnobDecorations()
                            : null
                    }
                </Pressable>
            </>
        )
    }

    exactKnobDecorations = () => {
        return <>
            <View style={{ borderLeftColor: styles.knob.color, borderLeftWidth: 1, height: 4, position: 'absolute', top: 0 }}></View>
            <View style={{ borderLeftColor: styles.knob.color, borderLeftWidth: 1, height: 4, position: 'absolute', bottom: 0 }}></View>
        </>
    }

    onLayout = (e: LayoutChangeEvent) => {
        const calculatedWidth = e.nativeEvent.layout.width;

        if (calculatedWidth != this.width.get()) {
            runInAction(() => {
                this.width.set(calculatedWidth)
                this.minKnobLeft.set(this.initialMinKnobLeft(calculatedWidth))
                this.maxKnobLeft.set(this.initialMaxKnobLeft(calculatedWidth))
            })
        }
    }

    previewLabel = () => {
        const inverted = this.knobsInverted.get();
        
        const leftVal = inverted
            ? this.maxKnobValue
            : this.minKnobValue;

        const rightVal = inverted 
            ? this.minKnobValue
            : this.maxKnobValue

        return this.isExactValue 
            ? leftVal == 0 || leftVal == MORE ? 'Any number' :  `Exactly ${leftVal}`
            : `inverted: ${inverted} / ${leftVal} ${rightVal == MORE ? 'or more' : `to ${rightVal}`}`

    }

    render() {
        const label = this.previewLabel()

        const sliderVerticalPadding = ((styles.knob.height - styles.step.height) / 2)

        const shim = styles.knob.width / 2;

        return (
            <View style={{ marginRight: 20 }}>    
                <View style={{ paddingTop: 20 }}>
                    <Text style={[styles.label]}>{label}</Text>
                </View>
                <View onLayout={this.onLayout} style={{ marginHorizontal: shim }}>
                    {
                        this.width.get() 
                            ? <View style={{position: 'relative', flexDirection: 'row', paddingVertical: sliderVerticalPadding, marginVertical: 20 }}>
                                { this.stepBar() }
                                { this.isExactValue 
                                    ? this.exactKnobs()
                                    : this.rangeKnobs() 
                                }
                            </View>
                            : null
                    }
                </View>
            </View>
        )
    }
}

export default SliderInput;

const styles = StyleSheet.create({
    label: {
        color: '#000',
        // paddingVertical: 12,
        fontSize: 16
    },
    step: {
        height: 4,
    },
    inRange: {
        backgroundColor: Colors.primary.alpha
    },
    outOfRange: {
        backgroundColor: '#E0DEE0'
    },
    knob: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        backgroundColor: '#fff',
        borderColor: Colors.primary.alpha,
        borderWidth: 1,
        color: Colors.primary.alpha,
        borderRadius: 30,
        height: 30,
        width: 30,
    },
    more: { 
        fontSize: 20
    }
})