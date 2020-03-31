// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Container } from 'inversify';
import { IMock, Mock } from 'typemoq';
import { getGlobalWebControllerDispatcher } from './get-global-web-controller-dispatcher';

// tslint:disable: no-any

jest.mock('./web-controller-dispatcher', () => {
    return {
        ['WebControllerDispatcher']: class WebControllerDispatcherStub {
            public startCallCount: number = 0;

            public async start(): Promise<void> {
                this.startCallCount += 1;
            }
        },
    };
});

describe(getGlobalWebControllerDispatcher, () => {
    let containerMock: IMock<Container>;

    beforeEach(() => {
        containerMock = Mock.ofType(Container);
    });

    it('does not create more than one instance', async () => {
        const instance1Promise = getGlobalWebControllerDispatcher(containerMock.object);
        const instance2Promise = getGlobalWebControllerDispatcher(containerMock.object);

        const instance1 = await instance1Promise;
        const instance2 = await instance2Promise;

        // tslint:disable-next-line: no-floating-promises
        expect(instance1).toBe(instance2);
        expect((instance1 as any).startCallCount).toBe(1);
    });
});
