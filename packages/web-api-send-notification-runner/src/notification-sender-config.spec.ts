// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Argv } from 'yargs';
import { NotificationSenderConfig } from './notification-sender-config';
// tslint:disable: no-any

describe(NotificationSenderConfig, () => {
    let testSubject: NotificationSenderConfig;
    let argvMock: IMock<Argv>;
    const argvVal = { foo: 'test' };

    beforeEach(() => {
        // tslint:disable-next-line: no-empty
        argvMock = Mock.ofInstance<Argv>(({ argv: undefined, demandOption: () => {} } as unknown) as Argv);
        testSubject = new NotificationSenderConfig(argvMock.object);
        argvMock.setup((a) => a.argv).returns(() => argvVal as any);
    });

    it('getConfig', () => {
        expect(testSubject.getConfig()).toBe(argvVal);

        argvMock.verify((a) => a.demandOption(['scanId', 'scanNotifyUrl', 'runStatus', 'scanStatus']), Times.once());
    });
});
