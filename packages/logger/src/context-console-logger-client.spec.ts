// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { ContextConsoleLoggerClient } from './context-console-logger-client';
import { RootConsoleLoggerClient } from './root-console-logger-client';

class TestableContextConsoleLoggerClient extends ContextConsoleLoggerClient {
    // tslint:disable-next-line: no-unnecessary-override
    public getPropertiesToAddToEvent(): { [name: string]: string } {
        return super.getPropertiesToAddToEvent();
    }
}

describe(ContextConsoleLoggerClient, () => {
    let testSubject: TestableContextConsoleLoggerClient;
    let rootLoggerClient: IMock<RootConsoleLoggerClient>;

    beforeEach(() => {
        rootLoggerClient = Mock.ofType(RootConsoleLoggerClient);

        testSubject = new TestableContextConsoleLoggerClient(
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
