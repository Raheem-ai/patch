/**
 * ONLY NEEDED FOR BUILD TIME
 * ie. publish will have this be blank in the manifest and that's okay
 * For Apple:
 * - corresponds to "CFBundleShortVersionString"
 * 
 * For Android: 
 * - corresponds to "versionName"
 * 
 * NOTE: increment every time you make a change that requires
 * a new build because of native code changes or build time native 
 * config changes
 */
exports.VERSION = `1.0.4`
// NOTE: this needs to be a positive integer that gets incremented along side VERSION
exports.ANDROID_VERSION_CODE = 15
// NOTE: this never needs to change
exports.IOS_VERSION_CODE = "1"
/**
 * This only is referring to if their is a native update tied to a feature that requires you to 
 * update from the app store. Over the air updates will happen automatically but building this in 
 * at build/deploy time lets us mandate peoeple updating to a specific version to continue using the app.
 * 
 * NOTE: this needs to be considered every native release...ie. if the last native update required an update 
 * but this one doesn't, this needs to be reset to false.
 * 
 * EX. 
 * Update1: includes new functionality to existing feature that isn't backwards compatible (on front end)
 * REQUIRES_UPDATE = true
 * 
 * Update2: includes net new features that are useful but don't affect the rest of the app if they aren't there
 * REQUIRES_UPDATE = false
 */
exports.REQUIRES_UPDATE = false // note: this changes the manual deployment steps...if true, should use a different
// build def that doesn't automatically switch traffic over