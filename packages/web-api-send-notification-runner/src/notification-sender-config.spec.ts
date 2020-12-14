// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { NotificationSenderConfig } from './notification-sender-config';
import { NotificationSenderMetadata } from './types/notification-sender-metadata';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe(NotificationSenderConfig, () => {
    let testSubject: NotificationSenderConfig;
    let argvMock: IMock<Argv>;
    const argvVal = { foo: 'test' };

    beforeEach(() => {
        argvMock = Mock.ofType<Argv>();
        testSubject = new NotificationSenderConfig(argvMock.object);
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
        argvMock.verify((a) => a.demandOption(['scanId', 'scanNotifyUrl', 'runStatus']), Times.once());
    });

    describe('yargs integration', () => {
        const args: NotificationSenderMetadata = {
            scanId: 'scan id',
            scanNotifyUrl: 'scan notify url',
            runStatus: 'completed',
        };

        beforeEach(() => {
            testSubject = new NotificationSenderConfig();
            Object.keys(args).forEach((varName: keyof NotificationSenderMetadata) => {
                process.env[varName] = args[varName];
            });
        });

        afterEach(() => {
            Object.keys(args).forEach((varName: keyof NotificationSenderMetadata) => {
                process.env[varName] = undefined;
            });
        });

        it('Gets correct config', () => {
            const config = testSubject.getConfig();

            expect(config).toMatchObject(args);
        });
    });
});
