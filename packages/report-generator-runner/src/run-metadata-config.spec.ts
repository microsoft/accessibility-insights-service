// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { RunMetadataConfig } from './run-metadata-config';
import { ReportGeneratorMetadata } from './types/report-generator-metadata';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(RunMetadataConfig, () => {
    let testSubject: RunMetadataConfig;
    let argvMock: IMock<Argv>;
    const argvVal = { foo: 'test' };

    beforeEach(() => {
        argvMock = Mock.ofType<Argv>();
        testSubject = new RunMetadataConfig(argvMock.object);
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
        argvMock.verify((a) => a.demandOption(['id']), Times.once());
        argvMock.verify((a) => a.demandOption(['scanGroupId']), Times.once());
        argvMock.verify((a) => a.demandOption(['targetReport']), Times.once());
    });

    describe('yargs integration', () => {
        const args: ReportGeneratorMetadata = {
            id: 'id',
            scanGroupId: 'scanGroupId',
            targetReport: 'accessibility',
        };

        beforeEach(() => {
            testSubject = new RunMetadataConfig();
            Object.keys(args).forEach((varName: keyof ReportGeneratorMetadata) => {
                process.env[varName] = `${args[varName]}`;
            });
        });

        afterEach(() => {
            Object.keys(args).forEach((varName: keyof ReportGeneratorMetadata) => {
                process.env[varName] = undefined;
            });
        });

        it('get correct config', () => {
            const config = testSubject.getConfig();
            expect(config).toMatchObject(args);
        });
    });
});
