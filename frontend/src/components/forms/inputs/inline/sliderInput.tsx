import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { View, StyleSheet, LayoutChangeEvent, Animated } from "react-native";
import { PanGestureHandler, PanGestureHandlerProps } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import STRINGS from "../../../../../../common/strings";
import { Colors } from "../../../../types";
import { SectionInlineViewProps } from "../../types";

const MORE = -1;

enum Knobs {
    Min,
    Max
}

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
        const val = Math.round((x + this.knobOffset) / this.stepWidth())
        
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
        // should these be declared somewhere else?
        const upperBound = this.width.get() - 2*this.knobOffset;
        const lowerBound = -this.knobOffset;

        // on android this gets called even when you aren't moving
        const onTouchMove = (isMin: boolean) => (delta: number) => {
            runInAction(() => {
                if (isMin) {
                    this.topKnob.set(Knobs.Min)
                    
                    const updatedMinLeft = this.touchStartX.get() + delta

                    // if maxKnob is all the way to the right, limit this one (minKnob) to one step less
                    if (this.maxKnobLeft.get() >= this.width.get() - this.knobOffset) {
                        if (updatedMinLeft > upperBound) {
                            this.minKnobLeft.set(upperBound);
                        } else if (updatedMinLeft < lowerBound) {
                            this.minKnobLeft.set(lowerBound);
                        } else {
                            this.minKnobLeft.set(updatedMinLeft);
                        }
                    } else {
                        // depends on if inverted or not
                        const bound = this.knobsInverted.get()
                            ? this.width.get() - this.knobOffset
                            : -this.knobOffset;

                        const insideBounds = this.knobsInverted.get()
                            ? updatedMinLeft < bound // upper bound
                            : updatedMinLeft > bound // lower bound

                            if (!insideBounds){                        
                                this.minKnobLeft.set(bound);
                            } else {
                                this.minKnobLeft.set(updatedMinLeft)
                            }
                    }
                } else {
                    this.topKnob.set(Knobs.Max)

                    const updatedMaxLeft = this.touchStartX.get() + delta

                    // if minKnob is all the way to the right, limit this one (maxKnob) to one step less
                    if (this.minKnobLeft.get() >= this.width.get() - this.knobOffset) {
                        if (updatedMaxLeft > upperBound) {
                            this.maxKnobLeft.set(upperBound);
                        } else if (updatedMaxLeft < lowerBound) {
                            this.maxKnobLeft.set(lowerBound);
                        } else {
                            this.maxKnobLeft.set(updatedMaxLeft);
                        }
                    } else {
                        // depends on if inverted or not
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
                }

                this.knobsInverted.set(this.minKnobLeft.get() > this.maxKnobLeft.get())
            })

        }

        const onTouchEnd = (isMin: boolean) => () => {
            
            runInAction(() => {
                if (isMin) {
                    const step = this.leftXToStep(this.minKnobLeft.get())
                    const valueToSet = this.stepToValue(step);
                    const stepLeft = this.stepLeft(step);
                    this.minKnobLeft.set(stepLeft)

                    if (valueToSet == this.maxKnobValue) {
                        this.isExact.set(true)
                    }

                     // need to consider inverted
                    this.props.config.onChange({ 
                        max: this.knobsInverted.get()
                            ? valueToSet
                            : this.maxKnobValue > this.maxBeforeOrMore 
                                ? MORE 
                                : this.maxKnobValue, 
                        min: this.knobsInverted.get()
                            ? this.maxKnobValue
                            : valueToSet 
                    })
                } else {
                    const step = this.leftXToStep(this.maxKnobLeft.get())
                    const valueToSet = this.stepToValue(step);
                    const stepLeft = this.stepLeft(step);
                    this.maxKnobLeft.set(stepLeft)

                    if (valueToSet == this.minKnobValue) {
                        this.isExact.set(true)
                    }

                    // need to consider inverted
                    this.props.config.onChange({ 
                        min: this.knobsInverted.get()
                            ? valueToSet
                            : this.minKnobValue, 
                        max: this.knobsInverted.get()
                            ? this.minKnobValue
                            : valueToSet > this.maxBeforeOrMore 
                                ? MORE 
                                : valueToSet 
                    })
                }
            })
        }

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

        const onTouchMove = (delta: number) => {
            runInAction(() => {
                if (delta > 0) {
                    // pull max open
                    if (this.minIsOnTop) {
                        this.knobsInverted.set(true);
                        this.minKnobLeft.set(this.touchStartX.get() + delta)
                    } else {
                        this.maxKnobLeft.set(this.touchStartX.get() + delta)
                    }
                } else {
                    // pull min open
                    if (this.maxIsOnTop) {
                        this.knobsInverted.set(true);
                        this.maxKnobLeft.set(this.touchStartX.get() + delta)
                    } else {
                        this.minKnobLeft.set(this.touchStartX.get() + delta)
                    }
                }

                this.isExact.set(false)
            })
        }

        const onTouchEnd = () => {

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
            onTouchMove: (delta: number) => void,
            onTouchEnd: () => void
        },
        max: {
            label: string,
            onTouchMove: (delta: number) => void,
            onTouchEnd: () => void
        }
    }) => {

        const onTouchStart = (isMin: boolean) => () => {
            runInAction(() => {
                if (isMin) {
                    this.touchStartX.set(this.minKnobLeft.get());
                } else {
                    this.touchStartX.set(this.maxKnobLeft.get());
                }
            })
        }

        const onTouchMove = (isMin: boolean) => (delta : number) => {
            runInAction(() => {
                if (isMin) {
                    config.min.onTouchMove(delta)
                } else {
                    config.max.onTouchMove(delta)
                }
            })
        }

        const onTouchEnd = (isMin: boolean) => () => {
            runInAction(() => {
                if (isMin) {
                    config.min.onTouchEnd()
                } else {
                    config.max.onTouchEnd()
                }
            })
        }

        return (
            <>
                <Knob 
                    key={'min'}
                    label={config.min.label}
                    onTop={this.minIsOnTop}
                    left={this.minKnobLeft.get()}
                    isExact={this.isExactValue}
                    onMove={onTouchMove(true)}
                    onStart={onTouchStart(true)}
                    onEnd={onTouchEnd(true)}
                />
                <Knob 
                    key={'max'}
                    label={config.max.label}
                    onTop={this.maxIsOnTop}
                    left={this.maxKnobLeft.get()}
                    isExact={this.isExactValue}
                    onMove={onTouchMove(false)}
                    onStart={onTouchStart(false)}
                    onEnd={onTouchEnd(false)}
                />
            </>
        )
    }

    onLayout = (e: LayoutChangeEvent) => {
        const calculatedWidth = e.nativeEvent.layout.width;

        if (calculatedWidth != this.width.get()) {
            runInAction(() => {
                this.width.set(calculatedWidth)
                this.minKnobLeft.set(this.initialMinKnobLeft(calculatedWidth))
                this.maxKnobLeft.set(this.initialMaxKnobLeft(calculatedWidth))
                
                if (this.isExactValue && (this.topKnob.get() == null)) {
                    this.topKnob.set(Knobs.Min)
                }
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
            ? leftVal == 0 || leftVal == MORE ? STRINGS.INTERFACE.anyNumber :  STRINGS.INTERFACE.exactly(leftVal)
            : `${leftVal} ${rightVal == MORE ? STRINGS.INTERFACE.orMore : STRINGS.INTERFACE.toValue(rightVal)}`

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
                            : <View style={{position: 'relative', flexDirection: 'row', paddingVertical: sliderVerticalPadding, marginVertical: 20 }}>
                                { this.stepBar() }
                            </View>
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


function Knob({
    onTop,
    label,
    left,
    key,
    isExact,
    onStart,
    onMove,
    onEnd
}: {
    onTop: boolean,
    label: string,
    left: number,
    key: string,
    isExact: boolean,
    onStart: () => void,
    onMove: (deltaX: number) => void,
    onEnd: () => void
}) {
    const positionStyles = { left: left, zIndex: onTop ? 10 : 1 }

    const exactKnobDecorations = () => {
        return <>
            <View style={{ borderLeftColor: styles.knob.color, borderLeftWidth: 1, height: 4, position: 'absolute', top: 0 }}></View>
            <View style={{ borderLeftColor: styles.knob.color, borderLeftWidth: 1, height: 4, position: 'absolute', bottom: 0 }}></View>
        </>
    }

    const panProps: PanGestureHandlerProps = {
        onBegan: (e) => {
            onStart()
        }, 
        onGestureEvent: (e) => {
            onMove(e.nativeEvent.translationX)
        },
        onEnded: (e) => {
            onEnd()
        }
    }

    return (
        <PanGestureHandler key={key} {...panProps} >
            <Animated.View
                style={[styles.knob, positionStyles]}
                >
                <Text style={{ color: styles.knob.color }}>{label}</Text>
                {
                    isExact && onTop
                        ? exactKnobDecorations()
                        : null
                }
            </Animated.View>
        </PanGestureHandler>
    )
}
