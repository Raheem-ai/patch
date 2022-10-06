import { Container } from 'inversify';
import { PersistentPropConfig, persistentPropConfigKey } from './persistentStorage';

export const container = new Container({ defaultScope: "Singleton" });

export const persistentKey = Symbol('persistent');

export function persistent(opts?: PersistentPropConfig): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        target[persistentKey] = target[persistentKey] ? target[persistentKey] : [];
        target[persistentKey].push(propertyKey);

        if (opts) {
            target[persistentPropConfigKey] = target[persistentPropConfigKey] || {};
            target[persistentPropConfigKey][propertyKey] = opts
        }
    }
}

export const securelyPersistentKey = Symbol('securelyPersistent');

export function securelyPersistent(opts?: PersistentPropConfig): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        target[securelyPersistentKey] = target[securelyPersistentKey] ? target[securelyPersistentKey] : [];
        target[securelyPersistentKey].push(propertyKey);

        if (opts) {
            target[persistentPropConfigKey] = target[persistentPropConfigKey] || {};
            target[persistentPropConfigKey][propertyKey] = opts
        }
    }
}