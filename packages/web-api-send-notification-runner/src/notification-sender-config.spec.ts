// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { NotificationSenderConfig } from './notification-sender-config';

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
        argvMock.verify((a) => a.demandOption(['scanId', 'scanNotifyUrl', 'runStatus', 'scanStatus']), Times.once());
    });
});
