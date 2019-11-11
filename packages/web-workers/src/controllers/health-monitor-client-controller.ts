// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { ContextAwareLogger } from 'logger';
import { ScanResultResponse, ScanRunResponse, WebController } from 'service-library';
import { A11yServiceClient, ResponseWithBodyType } from 'web-api-client';
import { ActivityAction } from '../contracts/activity-actions';
import { ActivityRequestData, CreateScanRequestData, GetScanReportData, GetScanResultData } from './activity-request-data';

// tslint:disable: no-any

@injectable()
export class HealthMonitorClientController extends WebController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'health-monitor-client';
    private readonly activityCallbacks: { [activityName: string]: (args: unknown) => Promise<unknown> };

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) contextAwareLogger: ContextAwareLogger,
        @inject(A11yServiceClient) protected webApiClient: A11yServiceClient,
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

        return activityCallback(activityRequestData.data);
    }

    protected validateRequest(...args: any[]): boolean {
        return true;
    }

    private readonly createScanRequest = async (data: CreateScanRequestData): Promise<ResponseWithBodyType<ScanRunResponse>> => {
        return this.webApiClient.postScanUrl(data.scanUrl, data.priority);
    };

    private readonly getScanResult = async (data: GetScanResultData): Promise<ResponseWithBodyType<ScanResultResponse>> => {
        return this.webApiClient.getScanStatus(data.scanId);
    };

    private readonly getScanReport = async (data: GetScanReportData): Promise<ResponseWithBodyType<unknown>> => {
        const result = await this.webApiClient.getScanReport(data.scanId, data.reportId);
        result.body = undefined;

        return result;
    };

    private readonly getHealthStatus = async (): Promise<void> => {
        return;
    };
}
