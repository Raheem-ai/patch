import {Dimensions, StatusBar} from 'react-native'; 
import { isAndroid } from '../constants';

export const SCREEN_DIMENSIONS = Dimensions.get('screen');
export const WINDOW_DIMENSIONS = Dimensions.get('window');

export const SCREEN_HEIGHT = SCREEN_DIMENSIONS.height; // device height
export const WINDOW_HEIGHT = WINDOW_DIMENSIONS.height;

export const SCREEN_WIDTH = SCREEN_DIMENSIONS.width; // device height
export const WINDOW_WIDTH = WINDOW_DIMENSIONS.width;

export const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 24; 
export const BOTTOM_BAR_HEIGHT = isAndroid
    ? SCREEN_HEIGHT - STATUS_BAR_HEIGHT - WINDOW_HEIGHT
    : 0;