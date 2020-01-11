// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { Context } from '@azure/functions';
import { ApplicationInsightsClient, ApplicationInsightsQueryResponse, ResponseWithBodyType } from 'azure-services';
import { ServiceConfiguration } from 'common';
import { HttpResponse, WebApiErrorCodes } from 'service-library';
import { IMock, It, Mock } from 'typemoq';
import { MockableLogger } from '../test-utilities/mockable-logger';
import { HealthCheckController, HealthTarget } from './health-check-controller';

// tslint:disable: no-unsafe-any no-any

describe(HealthCheckController, () => {
    const releaseTarget: HealthTarget = 'release';
    let healthCheckController: HealthCheckController;
    let context: Context;
    let serviceConfigurationMock: IMock<ServiceConfiguration>;
    let loggerMock: IMock<MockableLogger>;
    let appInsightsClientMock: IMock<ApplicationInsightsClient>;
    const e2eTestConfig = {
        testRunQueryTimespan: 'timespan',
    };
    const releaseVersion = 'test version';

    beforeEach(() => {
        process.env.RELEASE_VERSION = releaseVersion;
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
        serviceConfigurationMock.setup(async s => s.getConfigValue('e2eTestConfig')).returns(async () => Promise.resolve(e2eTestConfig));

        loggerMock = Mock.ofType<MockableLogger>();
        appInsightsClientMock = Mock.ofType(ApplicationInsightsClient);
        healthCheckController = new HealthCheckController(serviceConfigurationMock.object, loggerMock.object, async () =>
            Promise.resolve(appInsightsClientMock.object),
        );
        healthCheckController.context = context;
    });

    it('return echo health request', async () => {
        await healthCheckController.handleRequest();

        expect(context.res).toEqual({ status: 200 });
        loggerMock.verifyAll();
    });

    it('return not found for unknown target request', async () => {
        context.bindingData.target = 'other';
        await healthCheckController.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.resourceNotFound));
        loggerMock.verifyAll();
    });

    it('return missing release version when default version is unknown', async () => {
        delete process.env.RELEASE_VERSION;
        context.bindingData.target = releaseTarget;
        await healthCheckController.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.missingReleaseVersion));
        loggerMock.verifyAll();
    });

    it('return internal error on app insights failure', async () => {
        context.bindingData.target = releaseTarget;
        const failureResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = ({
            statusCode: 404,
            body: undefined,
        } as any) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
        setupAppInsightsResponse(failureResponse);

        await healthCheckController.handleRequest();

        expect(context.res).toEqual(HttpResponse.getErrorResponse(WebApiErrorCodes.internalError));
        appInsightsClientMock.verifyAll();
    });

    it('Test report contains correct version number', async () => {
        context.bindingData.target = releaseTarget;
        const successResponse: ResponseWithBodyType<ApplicationInsightsQueryResponse> = ({
            statusCode: 200,
            body: undefined,
        } as any) as ResponseWithBodyType<ApplicationInsightsQueryResponse>;
        setupAppInsightsResponse(successResponse);

        await healthCheckController.handleRequest();

        expect(context.res.status).toEqual(200);
        expect(context.res.body.buildVersion).toEqual(releaseVersion);
        appInsightsClientMock.verifyAll();
    });

    function setupAppInsightsResponse(response: ResponseWithBodyType<ApplicationInsightsQueryResponse>): void {
        appInsightsClientMock
            .setup(async a => a.executeQuery(It.isAny(), It.isAny()))
            .returns(async () => response)
            .verifiable();
    }
});
