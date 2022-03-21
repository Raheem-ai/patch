import { useCallback } from "react";

/**
 * Hook that takes a function to wrap and a function to compare the target function's params with
 * such that the underlying function is only called when the wrapped function is called the first time 
 * and every time after that when the params change (based on the compare function)
 *  function, and returns a wrapped function that is only called when 
 * @param fn function to wrap
 * @param paramsChanged function to compare `fn`'s params
 * @returns a function with a matching signature as `fn` except it will return `undefined` if 
 * it get's called when params haven't changed
 */
 export const useWhenParamsChange = function <Params>(
    fn: (params: Params) => void, 
    paramsChanged: (oldParams: Params, newParams: Params) => boolean,
    runFirstCall?: boolean
) {
    let firstCall = true;
    let oldParams;

    // allways return the same function so first call is relevant
    return useCallback((updatedParams: Params) => {
        if (runFirstCall && firstCall) {
            firstCall = false;
            oldParams = updatedParams;
            return fn(updatedParams)
        } else {
            if (paramsChanged(oldParams, updatedParams)) {
                oldParams = updatedParams;
                return fn(updatedParams)
            }
        }
    }, [])
}