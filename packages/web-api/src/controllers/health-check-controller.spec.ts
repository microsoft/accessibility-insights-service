// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { IMock, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';

import { ApplicationInsightsClient } from 'azure-services';
import { HealthCheckController } from './health-check-controller';

describe(HealthCheckController, () => {
    let healthCheckController: HealthCheckController;
    let context: Context;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let appInsightsClientMock: IMock<ApplicationInsightsClient>;

    beforeEach(() => {
        context = <Context>(<unknown>{
            req: {
                method: 'GET',
                headers: {},
                rawBody: ``,
                query: {},
            },
            bindingData: {},
        });

        serviceConfigurationMock = Mock.ofType<ServiceConfiguration>();

        loggerMock = Mock.ofType<MockableLogger>();
        appInsightsClientMock = Mock.ofType<ApplicationInsightsClient>();
        healthCheckController = new HealthCheckController(serviceConfigurationMock.object, loggerMock.object, appInsightsClientMock.object);
        healthCheckController.context = context;
    });

    it('Handle request', async () => {
        loggerMock.setup(t => t.trackEvent('HealthCheck')).verifiable(Times.once());
        await healthCheckController.handleRequest();
        expect(context.res.status).toEqual(200);
        loggerMock.verifyAll();
    });
});
