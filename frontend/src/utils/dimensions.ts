import {Dimensions, StatusBar} from 'react-native'; 
import { isAndroid } from '../constants';

export const SCREEN_HEIGHT = Dimensions.get('screen').height; // device height
export const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 24; 
export const WINDOW_HEIGHT = Dimensions.get('window').height;
export const BOTTOM_BAR_HEIGHT = isAndroid
    ? SCREEN_HEIGHT - STATUS_BAR_HEIGHT - WINDOW_HEIGHT
    : 0;