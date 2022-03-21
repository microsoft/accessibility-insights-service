// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { RunnerScanMetadata } from 'service-library';
import { RunnerScanMetadataConfig } from './runner-scan-metadata-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(RunnerScanMetadataConfig, () => {
    let testSubject: RunnerScanMetadataConfig;
    let argvMock: IMock<Argv>;
    const argvVal = { foo: 'test' };

    beforeEach(() => {
        argvMock = Mock.ofType<Argv>();
        testSubject = new RunnerScanMetadataConfig(argvMock.object);
        argvMock
            .setup((a) => a.env())
            .returns(() => argvMock.object as any)
            .verifiable();
        argvMock
            .setup((a) => a.argv)
            .returns(() => argvVal as any)
            .verifiable();
    });

    it('getConfig', () => {
        expect(testSubject.getConfig()).toBe(argvVal);
        argvMock.verify((a) => a.demandOption(['id', 'url']), Times.once());
    });

    describe('yargs integration', () => {
        const args: RunnerScanMetadata = {
            id: 'scan id',
            url: 'url',
            deepScan: true,
        };

        beforeEach(() => {
            testSubject = new RunnerScanMetadataConfig();
            Object.keys(args).forEach((varName: keyof RunnerScanMetadata) => {
                process.env[varName] = `${args[varName]}`;
            });
        });

        afterEach(() => {
            Object.keys(args).forEach((varName: keyof RunnerScanMetadata) => {
                process.env[varName] = undefined;
            });
        });

        it('Gets correct config', () => {
            const config = testSubject.getConfig();

            expect(config).toMatchObject(args);
        });
    });
});
