import { isNil } from 'lodash';

export function createInstanceIfNil<T>(instance: T, factory: () => T): T {
    if (isNil(instance)) {
        return factory();
    }

    return instance;
}
