// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { ContextAwareLogger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';

import { HealthCheckController } from './health-check-controller';

describe(HealthCheckController, () => {
    let healthCheckController: HealthCheckController;
    let context: Context;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let contextAwareLoggerMock: IMock<ContextAwareLogger>;

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

        contextAwareLoggerMock = Mock.ofType<ContextAwareLogger>();
        healthCheckController = new HealthCheckController(serviceConfigurationMock.object, contextAwareLoggerMock.object);
        healthCheckController.context = context;
    });

    it('Handle request', async () => {
        contextAwareLoggerMock.setup(t => t.trackEvent('HealthCheck')).verifiable(Times.once());
        await healthCheckController.handleRequest();
        expect(context.res.status).toEqual(200);
        contextAwareLoggerMock.verifyAll();
    });
});
