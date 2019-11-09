// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { IMock, It, Mock, Times } from 'typemoq';
import { A11yServiceClient } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import { HealthMonitorClientController } from './health-monitor-client-controller';

describe(HealthMonitorClientController, () => {
    let testSubject: HealthMonitorClientController;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;
    let context: Context;
    let webApiClientMock: IMock<A11yServiceClient>;

    beforeEach(() => {
        serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
        contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
        webApiClientMock = Mock.ofType(A11yServiceClient);
        context = <Context>(<unknown>{ bindingDefinitions: {}, bindings: {} });

        testSubject = new HealthMonitorClientController(
            serviceConfigurationMock.object,
            contextAwareLoggerMock.object,
            //webApiClientMock.object,
        );
    });

    afterEach(() => {
        webApiClientMock.verifyAll();
        contextAwareLoggerMock.verifyAll();
    });

    describe('invoke', () => {
        it('handles createScanRequest', async () => {
            const scanUrl = 'scanUrl';
            webApiClientMock
                .setup(async w => w.postScanUrl(scanUrl, 1))
                .returns(async () =>
                    Promise.resolve({
                        scanId: 'scan-id',
                        url: scanUrl,
                    }),
                )
                .verifiable(Times.once());
            await testSubject.invoke(context, ActivityAction.createScanRequest);
        });
    });
});
