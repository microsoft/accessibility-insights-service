// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ApplicationInsightsClient, ApplicationInsightsQueryResponse, ResponseWithBodyType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { HealthCheckController } from './health-check-controller';

// tslint:disable: no-unsafe-any no-any

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
        appInsightsClientMock = Mock.ofType(ApplicationInsightsClient);
        healthCheckController = new HealthCheckController(serviceConfigurationMock.object, loggerMock.object, async () =>
            Promise.resolve(appInsightsClientMock.object),
        );
        healthCheckController.context = context;
    });

    it('Handle request', async () => {
        const successResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = ({
            statusCode: 200,
            body: undefined,
        } as any) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;

        appInsightsClientMock.setup(async a => a.executeQuery(It.isAny(), It.isAny())).returns(async () => successResponse);
        loggerMock.setup(t => t.trackEvent('HealthCheck')).verifiable(Times.once());

        await healthCheckController.handleRequest();

        expect(context.res.status).toEqual(200);
        expect(context.res.body.error).toBeUndefined();
        loggerMock.verifyAll();
    });

    it('Returns 200 on app insights failure', async () => {
        const failureResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = ({
            statusCode: 404,
            body: undefined,
        } as any) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;

        appInsightsClientMock
            .setup(async a => a.executeQuery(It.isAny(), It.isAny()))
            .returns(async () => failureResponse)
            .verifiable();

        await healthCheckController.handleRequest();

        expect(context.res.status).toEqual(200);
        expect(context.res.body.error).toBeDefined();
        appInsightsClientMock.verifyAll();
    });
});
