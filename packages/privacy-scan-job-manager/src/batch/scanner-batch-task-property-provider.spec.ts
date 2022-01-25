// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { JobManagerConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { ScannerBatchTaskPropertyProvider } from './scanner-batch-task-property-provider';

/* eslint-disable @typescript-eslint/consistent-type-assertions */

describe(ScannerBatchTaskPropertyProvider, () => {
    let testSubject: ScannerBatchTaskPropertyProvider;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        testSubject = new ScannerBatchTaskPropertyProvider(serviceConfigMock.object);
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
    });

    it('get image name', async () => {
        serviceConfigMock
            .setup(async (o) => o.getConfigValue('jobManagerConfig'))
            .returns(() => Promise.resolve({ scanRunnerTaskImageName: 'scanRunnerTaskImageName' } as JobManagerConfig))
            .verifiable();

        const actualImageName = await testSubject.getImageName();
        expect(actualImageName).toEqual('scanRunnerTaskImageName');
    });

    it('get additional container run options', () => {
        const actualRunOptions = testSubject.getAdditionalContainerRunOptions();
        expect(actualRunOptions).toEqual('');
    });

    it('get get user elevation level', () => {
        const actualElevationLevel = testSubject.getUserElevationLevel();
        expect(actualElevationLevel).toEqual('admin');
    });
});
