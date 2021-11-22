import { useCallback, useEffect, useRef, useState } from "react";

export default function useSynchronizableState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState<T>(initialState);
  const onStateSetRef = useRef<(T) => void>(null); // init mutable ref container for callbacks

  const setStateCallback = useCallback((setter: React.SetStateAction<T>, onStateSet: (currState: T) => void) => {
    onStateSetRef.current = onStateSet; // store current, passed callback in ref
    setState(setter);
  }, []); // keep object reference stable, exactly like `useState`

  useEffect(() => {
    // onStateSet.current is `null` on initial render, 
    // so we only invoke callback on state *updates*
    if (onStateSetRef.current) {
      onStateSetRef.current(state);
      onStateSetRef.current = null; // reset callback after execution
    }
  }, [state]);

  return [state, setStateCallback] as [T, (setter: React.SetStateAction<T>, onStateSet?: (currState: T) => void) => void];
}