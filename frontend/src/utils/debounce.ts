import * as _ from 'lodash';
import { DebounceSettings } from 'lodash';
import { runInAction } from 'mobx';
import { AnyFunction } from '../../../common/models';
import { unwrap } from '../../../common/utils';


export interface StatefullMemoDebouncedFunction<F extends AnyFunction, S extends {} = {}> extends _.DebouncedFunc<F> {
    (...args: Parameters<F>): ReturnType<F> | undefined;
    flush: (...args: Parameters<F>) => ReturnType<F> | undefined;
    cancel: (...args: Parameters<F>) => void;
}

export type Config<F extends AnyFunction, S = {}> = DebounceSettings & {
    minWait: number,
    
    initialState?: S | (() => S),
    paramsToMemoCacheKey?: (...args: Parameters<F>) => string | Symbol,
    beforeCall?: (state: S, ...args: Parameters<F>) => void;
    afterCall?: (state: S, ...args: Parameters<F>) => void;    
    beforeCancel?: (state: S, ...args: Parameters<F>) => void;    
    afterCancel?: (state: S, ...args: Parameters<F>) => void;    
}

export function stateFullMemoDebounce<F extends AnyFunction, S = {}>(
    originalFunc: F,
    config: Config<F, S>
): StatefullMemoDebouncedFunction<F> {
    const instrumentedFunc = async (...args: Parameters<F>) => {
        const res = await originalFunc(...args);

        runInAction(() => {
            config.afterCall?.(state, ...args);
        })

        return res;
    }

    const debounceMemo = _.memoize<(...args: Parameters<F>) => _.DebouncedFunc<F>>(
        (..._args: Parameters<F>) => _.debounce(instrumentedFunc, config.minWait || 0, config),
        config.paramsToMemoCacheKey
    );

    const state: S = config.initialState
        ? unwrap(config.initialState as any)
        : {} as S;

    function wrappedFunction(
        this: StatefullMemoDebouncedFunction<F>,
        ...args: Parameters<F>
    ): ReturnType<F> | undefined {
        runInAction(() => {
            config.beforeCall?.(state, ...args);
        })

        const res = debounceMemo(...args)(...args);

        return res;
    }

    const flush: StatefullMemoDebouncedFunction<F>['flush'] = (...args) => {
        config.beforeCall?.(state, ...args);
        
        return debounceMemo(...args).flush();
    };

    const cancel: StatefullMemoDebouncedFunction<F>['cancel'] = (...args) => {
        config.beforeCancel?.(state, ...args);

        const res = debounceMemo(...args).cancel();

        config.afterCancel?.(state, ...args);

        return res;
    };

    wrappedFunction.flush = flush;
    wrappedFunction.cancel = cancel;

    return wrappedFunction;
}