import config from './config'
import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
// optionally providing an access token if you have enabled push security
export const expo = new Expo({ accessToken: config.EXPO.get().push_notifications_token });