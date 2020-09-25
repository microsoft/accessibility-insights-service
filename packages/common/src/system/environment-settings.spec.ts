// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { EnvironmentSettings } from './environment-settings';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(EnvironmentSettings, () => {
    let testSubject: EnvironmentSettings;
    let processStub: typeof process;

    beforeEach(() => {
        processStub = {
            env: {},
        } as any;
        testSubject = new EnvironmentSettings(processStub);
    });

    describe('tryGetValue', () => {
        it('returns value from environment variables', () => {
            const key = 'key1';
            const value = 'value 1';
            processStub.env[key] = value;

            expect(testSubject.tryGetValue(key)).toBe(value);
        });

        it('should not throw if not set', () => {
            const key = 'key1';

            expect(testSubject.tryGetValue(key)).not.toBeDefined();
        });
    });

    describe('getValue', () => {
        it('returns value from environment variables', () => {
            const key = 'key1';
            const value = 'value 1';
            processStub.env[key] = value;

            expect(testSubject.getValue(key)).toBe(value);
        });

        it('should not throw if not set', () => {
            const key = 'key1';

            expect(() => testSubject.getValue(key)).toThrowError(`Unable to get environment property value for ${key}`);
        });
    });
});
