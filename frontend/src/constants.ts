import Constants from "expo-constants";

export const ActiveRequestTabHeight = 100;
export const isAndroid = !!Constants.platform['android']
export const isIos = !!Constants.platform['ios']

export const ResponderCountRange = [1, 2, 3, 4, 5];

export const headerIconSize = 30;
export const headerIconPadding = 12;
export const headerIconContainerSize = (2 * headerIconPadding) + headerIconSize;

export const InteractiveHeaderHeight = headerIconContainerSize;
export const HeaderHeight = InteractiveHeaderHeight + Constants.statusBarHeight;
export const TabbedScreenHeaderHeight = InteractiveHeaderHeight - 12;
