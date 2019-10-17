// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ServiceConfiguration } from 'common';
import { Logger } from 'logger';
import { IMock, Mock, Times } from 'typemoq';

import { HealthCheckController } from './health-check-controller';

describe(HealthCheckController, () => {
    let healthCheckController: HealthCheckController;
    let context: Context;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<Logger>;

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

        loggerMock = Mock.ofType<Logger>();
        healthCheckController = new HealthCheckController(serviceConfigurationMock.object, loggerMock.object);
        healthCheckController.context = context;
    });

    it('Handle request', async () => {
        loggerMock.setup(t => t.trackEvent('Health check success')).verifiable(Times.once());
        await healthCheckController.handleRequest();
        expect(context.res.status).toEqual(200);
        loggerMock.verifyAll();
    });
});
