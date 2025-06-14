// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { GuidGenerator, ServiceConfiguration, getSerializableResponse, ResponseSerializer, SerializableResponse } from 'common';
import { functionalTestGroupTypes, TestGroupConstructor, TestRunner } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { HealthReport, OnDemandPageScanRunResultProvider, ScanResultResponse, ScanRunResponse } from 'service-library';
import { A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { ActivityHandler } from 'durable-functions';
import { ActivityAction } from '../contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    LogTestRunStartData,
    RunFunctionalTestGroupData,
    TrackAvailabilityData,
} from './activity-request-data';
import { WebApiConfig } from './web-api-config';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class HealthMonitorActivity {
    public static readonly activityName = 'health-monitor-activity';

    private readonly activityCallbacks: { [activityName: string]: (args: any) => Promise<any> };

    private readonly createScanRequest = async (data: CreateScanRequestData): Promise<SerializableResponse<ScanRunResponse[]>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.postScanUrl(data.scanUrl, data.scanOptions);

        return this.serializeResponse(response);
    };

    private readonly getScanResult = async (data: GetScanResultData): Promise<SerializableResponse<ScanResultResponse>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.getScanStatus(data.scanId);

        return this.serializeResponse(response);
    };

    private readonly getScanReport = async (data: GetScanReportData): Promise<SerializableResponse<Buffer>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.getScanReport(data.scanId, data.reportId);
        response.body = undefined;

        return this.serializeResponse(response);
    };

    private readonly getHealthStatus = async (): Promise<SerializableResponse<HealthReport>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.checkHealth();

        return this.serializeResponse(response);
    };

    private readonly trackAvailability = async (data: TrackAvailabilityData): Promise<void> => {
        this.logger.trackAvailability(data.name, data.telemetry);
    };

    private readonly runFunctionalTestGroup = async (data: RunFunctionalTestGroupData): Promise<void> => {
        const webApiClient = await this.webApiClientProvider();
        const functionalTestGroupCtor = this.testGroupTypes[data.test.testGroupName];
        const functionalTestGroup = new functionalTestGroupCtor(webApiClient, this.onDemandPageScanRunResultProvider, this.guidGenerator);
        functionalTestGroup.setTestContext(data.testContextData);
        const testRunMetadata = {
            environment: data.environment,
            releaseId: data.releaseId,
            runId: data.runId,
            scenarioName: data.test.scenarioName,
            scanId: data.testContextData.scanId,
        };

        await this.testRunner.run(functionalTestGroup, testRunMetadata);
    };

    private readonly logTestRunStart = async (data: LogTestRunStartData): Promise<void> => {
        const formattedTestIds = data.testsToRun.map((testId) => {
            return {
                testGroupName: functionalTestGroupTypes[testId.testGroupName].name,
                scenarioName: testId.scenarioName,
            };
        });
        const testIdsString = JSON.stringify(formattedTestIds);
        const properties = {
            source: 'BeginTestSuite',
            functionalTestGroups: testIdsString,
            runId: data.runId,
            releaseId: data.releaseId,
            environment: data.environmentName,
        };
        this.logger.trackEvent('FunctionalTest', properties);
    };

    private readonly getWebApiConfig = async (): Promise<WebApiConfig> => {
        return new WebApiConfig();
    };

    public handler: ActivityHandler = async (activityRequestData: ActivityRequestData): Promise<any> => {
        this.logger.setCommonProperties({ source: 'healthMonitorActivity' });
        this.logger.logInfo(`Executing ${activityRequestData.activityName} activity action.`);

        const activityCallback = this.activityCallbacks[activityRequestData.activityName];
        const result = await activityCallback(activityRequestData.data);

        this.logger.logInfo(`${activityRequestData.activityName} activity action completed with result ${JSON.stringify(result)}`);

        return result;
    };

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) protected readonly logger: GlobalLogger,
        @inject(a11yServiceClientTypeNames.A11yServiceClientProvider) protected readonly webApiClientProvider: A11yServiceClientProvider,
        @inject(OnDemandPageScanRunResultProvider) protected readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(GuidGenerator) protected readonly guidGenerator: GuidGenerator,
        @inject(TestRunner) protected readonly testRunner: TestRunner,
        protected readonly testGroupTypes: { [key: string]: TestGroupConstructor } = functionalTestGroupTypes,
        protected readonly serializeResponse: ResponseSerializer = getSerializableResponse,
    ) {
        testRunner.setLogger(this.logger);

        this.activityCallbacks = {
            [ActivityAction.createScanRequest]: this.createScanRequest,
            [ActivityAction.getScanResult]: this.getScanResult,
            [ActivityAction.getScanReport]: this.getScanReport,
            [ActivityAction.getHealthStatus]: this.getHealthStatus,
            [ActivityAction.trackAvailability]: this.trackAvailability,
            [ActivityAction.runFunctionalTestGroup]: this.runFunctionalTestGroup,
            [ActivityAction.logTestRunStart]: this.logTestRunStart,
            [ActivityAction.getWebApiConfig]: this.getWebApiConfig,
        };
    }
}
