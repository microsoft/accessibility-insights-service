// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { ConsoleLoggerClient } from './console-logger-client';
import { ContextAwareConsoleLoggerClient } from './context-aware-console-logger-client';

class TestableContextAwareConsoleLoggerClient extends ContextAwareConsoleLoggerClient {
    // tslint:disable-next-line: no-unnecessary-override
    public getPropertiesToAddToEvent(): { [name: string]: string } {
        return super.getPropertiesToAddToEvent();
    }
}

describe(ContextAwareConsoleLoggerClient, () => {
    let testSubject: TestableContextAwareConsoleLoggerClient;
    let rootLoggerClient: IMock<ConsoleLoggerClient>;

    beforeEach(() => {
        rootLoggerClient = Mock.ofType(ConsoleLoggerClient);

        testSubject = new TestableContextAwareConsoleLoggerClient(
            Mock.ofType(ServiceConfiguration).object,
            Mock.ofType<typeof console>().object,
            rootLoggerClient.object,
        );
    });

    describe('getPropertiesToAddToEvent', () => {
        it('returns properties from root logger', () => {
            const rootLoggerProps = { rProp: 'rVal' };

            rootLoggerClient.setup(r => r.getDefaultProperties()).returns(() => rootLoggerProps);

            expect(testSubject.getPropertiesToAddToEvent()).toEqual(rootLoggerProps);
        });
    });
});
