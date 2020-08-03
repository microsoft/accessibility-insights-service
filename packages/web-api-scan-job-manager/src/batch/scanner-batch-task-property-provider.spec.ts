// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { JobManagerConfig, ServiceConfiguration } from 'common';
import { IMock, Mock } from 'typemoq';
import { ScannerBatchTaskPropertyProvider } from './scanner-batch-task-property-provider';

// tslint:disable: no-object-literal-type-assertion

describe(ScannerBatchTaskPropertyProvider, () => {
    let testSubject: ScannerBatchTaskPropertyProvider;
    let serviceConfigMock: IMock<ServiceConfiguration>;

    beforeEach(() => {
        serviceConfigMock = Mock.ofType(ServiceConfiguration);
        serviceConfigMock
            .setup(async (o) => o.getConfigValue('jobManagerConfig'))
            .returns(() => Promise.resolve({ scanRunnerTaskImageName: 'scanRunnerTaskImageName' } as JobManagerConfig))
            .verifiable();
        testSubject = new ScannerBatchTaskPropertyProvider(serviceConfigMock.object);
    });

    afterEach(() => {
        serviceConfigMock.verifyAll();
    });

    it('get image name', async () => {
        const actualImageName = await testSubject.getImageName();
        expect(actualImageName).toEqual('scanRunnerTaskImageName');
    });
});
