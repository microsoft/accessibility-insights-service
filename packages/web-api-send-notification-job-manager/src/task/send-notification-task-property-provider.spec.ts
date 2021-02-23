// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { JobManagerConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { SendNotificationTaskPropertyProvider } from './send-notification-task-property-provider';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(SendNotificationTaskPropertyProvider, () => {
    let testSubject: SendNotificationTaskPropertyProvider;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (o) => o.getConfigValue('jobManagerConfig'))
            .returns(() => Promise.resolve({ sendNotificationTaskImageName: 'sendNotificationTaskImageName' } as JobManagerConfig))
            .verifiable();
        testSubject = new SendNotificationTaskPropertyProvider(serviceConfigMock.object);
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
    });

    it('get image name', async () => {
        const actualImageName = await testSubject.getImageName();
        expect(actualImageName).toEqual('sendNotificationTaskImageName');
    });

    it('get get user elevation level', () => {
        const actualElevationLevel = testSubject.getUserElevationLevel();
        expect(actualElevationLevel).toEqual('nonadmin');
    });
});
