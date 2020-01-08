// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { FunctionalTestGroup, FunctionalTestGroupFactory, TestContextData } from 'functional-tests';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { HealthReport, ScanResultResponse, ScanRunResponse, WebController } from 'service-library';
import { A11yServiceClientProvider, a11yServiceClientTypeNames } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    RunFunctionalTestGroupData,
    SerializableResponse,
    TrackAvailabilityData,
} from './activity-request-data';

// tslint:disable: no-any

@injectable()
export class HealthMonitorClientController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-client';
    private readonly activityCallbacks: { [activityName: string]: (args: unknown) => Promise<unknown> };

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) logger: Logger,
        @inject(a11yServiceClientTypeNames.A11yServiceClientProvider) protected readonly webApiClientProvider: A11yServiceClientProvider,
        @inject(FunctionalTestGroupFactory) protected readonly functionalTestGroupFactory: FunctionalTestGroupFactory,
    ) {
        super(logger);

        this.activityCallbacks = {
            [ActivityAction.createScanRequest]: this.createScanRequest,
            [ActivityAction.getScanResult]: this.getScanResult,
            [ActivityAction.getScanReport]: this.getScanReport,
            [ActivityAction.getHealthStatus]: this.getHealthStatus,
            [ActivityAction.trackAvailability]: this.trackAvailability,
            [ActivityAction.runFunctionalTestGroup]: this.runFunctionalTestGroup,
        };
    }

    protected async handleRequest(...args: any[]): Promise<unknown> {
        const activityRequestData = args[0] as ActivityRequestData;
        this.logger.logInfo(`Executing ${activityRequestData.activityName} activity action.`);

        const activityCallback = this.activityCallbacks[activityRequestData.activityName];
        const result = await activityCallback(activityRequestData.data);
        this.logger.logInfo(`${activityRequestData.activityName} activity action completed with result ${JSON.stringify(result)}`);

        return result;
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    private readonly createScanRequest = async (data: CreateScanRequestData): Promise<SerializableResponse<ScanRunResponse>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.postScanUrl(data.scanUrl, data.priority);

        return response.toJSON();
    };

    private readonly getScanResult = async (data: GetScanResultData): Promise<SerializableResponse<ScanResultResponse>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.getScanStatus(data.scanId);

        return response.toJSON();
    };

    private readonly getScanReport = async (data: GetScanReportData): Promise<SerializableResponse> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.getScanReport(data.scanId, data.reportId);
        response.body = undefined;

        return response.toJSON();
    };

    private readonly getHealthStatus = async (): Promise<SerializableResponse<HealthReport>> => {
        const webApiClient = await this.webApiClientProvider();
        const response = await webApiClient.checkHealth();

        return response.toJSON();
    };

    private readonly trackAvailability = async (data: TrackAvailabilityData): Promise<void> => {
        this.logger.trackAvailability(data.name, data.telemetry);
    };

    private readonly runFunctionalTestGroup = async (data: RunFunctionalTestGroupData): Promise<TestContextData> => {
        const functionalTestGroup = await this.functionalTestGroupFactory.createFunctionalTestGroup(data.testGroupName, this.logger);

        return functionalTestGroup.run(data.testContextData, data.env);
    };
}
