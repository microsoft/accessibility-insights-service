// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { A11yServiceClient } from 'web-api-client';

import { IMock, It, Mock, Times } from 'typemoq';

import { HealthMonitorClientController } from './health-monitor-client-controller';

let testSubject: HealthMonitorClientController;
let serviceConfigurationMock: IMock<ServiceConfiguration>;
let contextAwareLoggerMock: IMock<ContextAwareLogger>;
let context: Context;
let webApiClientMock: IMock<A11yServiceClient>;

beforeEach(() => {
    serviceConfigurationMock = Mock.ofType(ServiceConfiguration);
    contextAwareLoggerMock = Mock.ofType(ContextAwareLogger);
    webApiClientMock = Mock.ofType(A11yServiceClient);
    context = <Context>(<unknown>{ bindingDefinitions: {} });

    testSubject = new HealthMonitorClientController(
        serviceConfigurationMock.object,
        contextAwareLoggerMock.object,
        webApiClientMock.object,
    );
});

afterEach(() => {
    webApiClientMock.verifyAll();
    contextAwareLoggerMock.verifyAll();
});

describe('createScanRequest', () => {
    it('createScanRequest', async () => {
        return;
    });
});
