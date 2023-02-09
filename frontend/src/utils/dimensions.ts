import { Dimensions } from 'react-native'; 
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { isAndroid } from '../constants';

export const SCREEN_DIMENSIONS = Dimensions.get('screen');
export const WINDOW_DIMENSIONS = Dimensions.get('window');

export const SCREEN_HEIGHT = SCREEN_DIMENSIONS.height; // device height
export const WINDOW_HEIGHT = WINDOW_DIMENSIONS.height;

export const SCREEN_WIDTH = SCREEN_DIMENSIONS.width; // device height
export const WINDOW_WIDTH = WINDOW_DIMENSIONS.width;
 
export const BOTTOM_BAR_HEIGHT = isAndroid
    ? initialWindowMetrics.insets.bottom
    : 0;

/**
 * TODO: 
 * 1) should we be using initialWindowMetrics.insets.top for the status bar height?
 * 2) make everywhere that calls Dimensions.get() use these exports instead so we can track them/evolve them to be more dynamic
 * *** places where they use width will be a find and replace...height will more likely be more complicated
 */