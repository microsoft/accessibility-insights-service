// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ScanResultResponse, ScanRunResponse, WebController } from 'service-library';
import { A11yServiceClient, ResponseWithBodyType } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import { A11yServiceClientProvider, iocTypeNames } from '../ioc-types';
import {
    ActivityRequestData,
    CreateScanRequestData,
    GetScanReportData,
    GetScanResultData,
    SerializableResponse,
} from './activity-request-data';

// tslint:disable: no-any

@injectable()
export class HealthMonitorClientController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-client';
    private readonly activityCallbacks: { [activityName: string]: (args: unknown) => Promise<unknown> };

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
        @inject(iocTypeNames.A11yServiceClientProvider) protected readonly webApiClientProvider: A11yServiceClientProvider,
    ) {
        super(contextAwareLogger);

        this.activityCallbacks = {
            [ActivityAction.createScanRequest]: this.createScanRequest,
            [ActivityAction.getScanResult]: this.getScanResult,
            [ActivityAction.getScanReport]: this.getScanReport,
            [ActivityAction.getHealthStatus]: this.getHealthStatus,
        };
    }

    protected async handleRequest(...args: any[]): Promise<unknown> {
        const activityRequestData = args[0] as ActivityRequestData;
        this.contextAwareLogger.logInfo(`Executing ${activityRequestData.activityName} activity action.`);

        const activityCallback = this.activityCallbacks[activityRequestData.activityName];

        const result = activityCallback(activityRequestData.data);
        this.contextAwareLogger.logInfo(
            `${activityRequestData.activityName} activity action completed with result ${JSON.stringify(result)}`,
        );

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

    private readonly getHealthStatus = async (): Promise<SerializableResponse> => {
        const webApiClient = await this.webApiClientProvider();

        const response = await webApiClient.checkHealth();

        return response.toJSON();
    };
}
