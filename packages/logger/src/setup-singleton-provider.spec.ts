import 'reflect-metadata';

import { Container, interfaces } from 'inversify';
import { setupSingletonProvider } from './setup-singleton-provider';

describe(setupSingletonProvider, () => {
    let container: interfaces.Container;

    beforeEach(() => {
        container = new Container();
    });

    it('creates singleton provider', async () => {
        const key = 'provider1';
        let instanceCount = 0;

        const factory = async () => {
            instanceCount += 1;

            return instanceCount;
        };

        setupSingletonProvider(key, container, factory);

        const instanceProvider1: () => Promise<number> = container.get(key);
        const instanceProvider2: () => Promise<number> = container.get(key);

        await expect(instanceProvider1()).resolves.toBe(1);
        await expect(instanceProvider2()).resolves.toBe(1);
    });
});
