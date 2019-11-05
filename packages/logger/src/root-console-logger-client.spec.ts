// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { ServiceConfiguration } from 'common';
import { Mock } from 'typemoq';
import { RootConsoleLoggerClient } from './root-console-logger-client';

class TestableRootConsoleLoggerClient extends RootConsoleLoggerClient {
    // tslint:disable-next-line: no-unnecessary-override
    public getPropertiesToAddToEvent(): { [name: string]: string } {
        return super.getPropertiesToAddToEvent();
    }
}

describe(RootConsoleLoggerClient, () => {
    let testSubject: TestableRootConsoleLoggerClient;

    beforeEach(() => {
        testSubject = new TestableRootConsoleLoggerClient(Mock.ofType(ServiceConfiguration).object, Mock.ofType<typeof console>().object);
    });

    describe('getPropertiesToAddToEvent', () => {
        it('returns empty object', () => {
            expect(testSubject.getPropertiesToAddToEvent()).toEqual({});
        });
    });
});
