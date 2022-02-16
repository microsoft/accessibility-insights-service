// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { PrivacyScanResult } from 'scanner-global-library';
import { OnDemandPageScanRunResultProvider, WebsiteScanResultProvider, ReportWriter, GeneratedReport } from 'service-library';
import { OnDemandPageScanReport, OnDemandPageScanResult, OnDemandPageScanRunState, ScanError, WebsiteScanResult } from 'storage-documents';
import { System, ServiceConfiguration } from 'common';
import _ from 'lodash';
import { RunMetadataConfig } from '../run-metadata-config';
import { ReportGeneratorRunnerTelemetryManager } from '../report-generator-runner-telemetry-manager';
import { ReportGeneratorMetadata } from '../types/report-generator-metadata';
import { RequestSelector } from './request-selector';

@injectable()
export class Runner {
    constructor(
        @inject(RunMetadataConfig) private readonly runMetadataConfig: RunMetadataConfig,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(RequestSelector) protected readonly requestSelector: RequestSelector,
        @inject(ReportGeneratorRunnerTelemetryManager) private readonly telemetryManager: ReportGeneratorRunnerTelemetryManager,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const runMetadata = this.runMetadataConfig.getConfig();

        this.logger.setCommonProperties({ scanGroupId: runMetadata.scanGroupId });
        this.logger.logInfo('Start report generator runner.');

        this.telemetryManager.trackRequestStarted(runMetadata.scanGroupId);
        try {
            const requests = await this.requestSelector.getRequests();
            await this.processScanResult(privacyScanResults, pageScanResult);
        } catch (error) {
            const errorMessage = System.serializeError(error);
            this.setRunResult(pageScanResult, 'failed', errorMessage);

            this.logger.logError(`The report generator processor failed to scan a webpage.`, { error: errorMessage });
            this.telemetryManager.trackRequestFailed();
        } finally {
            this.telemetryManager.trackRequestCompleted();
        }

        await this.updateScanResult(runMetadata, pageScanResult);

        this.logger.logInfo('Stop report generator runner.');
    }

    private async updateScanRunState(scanId: string): Promise<OnDemandPageScanResult> {
        this.logger.logInfo(`Updating webpage scan run state to 'running'.`);
        const partialPageScanResult: Partial<OnDemandPageScanResult> = {
            id: scanId,
            run: {
                state: 'running',
                timestamp: new Date().toJSON(),
                error: null,
            },
            scanResult: null,
            reports: null,
        };
        const response = await this.onDemandPageScanRunResultProvider.tryUpdateScanRun(partialPageScanResult);
        if (!response.succeeded) {
            this.logger.logWarn(
                `Update webpage scan run state to 'running' failed due to merge conflict with other process. Exiting webpage scan task.`,
            );

            return undefined;
        }

        return response.result;
    }

    private async processScanResult(
        privacyScanResult: PrivacyScanResult,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<PrivacyScanResult> {
        if (_.isEmpty(privacyScanResult.error)) {
            this.setRunResult(pageScanResult, 'completed');
            pageScanResult.scanResult = {
                state: 'pass', // TBD
            };
            pageScanResult.reports = await this.generateScanReports(privacyScanResult);
            if (privacyScanResult.scannedUrl !== undefined) {
                pageScanResult.scannedUrl = privacyScanResult.scannedUrl;
            }
        } else {
            this.setRunResult(pageScanResult, 'failed', privacyScanResult.error);

            this.logger.logError('Browser has failed to scan a webpage.', { error: JSON.stringify(privacyScanResult.error) });
            this.telemetryManager.trackBrowserScanFailed();
        }

        pageScanResult.run.pageResponseCode = privacyScanResult.pageResponseCode;

        return privacyScanResult.error ? undefined : privacyScanResult;
    }

    private async updateScanResult(
        scanMetadata: ReportGeneratorMetadata,
        pageScanResult: Partial<OnDemandPageScanResult>,
    ): Promise<WebsiteScanResult> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
        if (websiteScanRef) {
            const scanConfig = await this.serviceConfig.getConfigValue('scanConfig');
            const runState =
                pageScanResult.run.state === 'completed' || pageScanResult.run.retryCount >= scanConfig.maxFailedScanRetryCount
                    ? pageScanResult.run.state
                    : undefined;

            const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                id: websiteScanRef.id,
                pageScans: [
                    {
                        scanId: scanMetadata.scanGroupId,
                        url: '', // TBD
                        scanState: pageScanResult.scanResult?.state,
                        runState,
                        timestamp: new Date().toJSON(),
                    },
                ],
            };

            return this.websiteScanResultProvider.mergeOrCreate(scanMetadata.scanGroupId, updatedWebsiteScanResult, true);
        }

        return undefined;
    }

    private async generateScanReports(privacyScanResult: PrivacyScanResult): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating privacy scan report for a webpage scan.`);
        const reports = [{}] as GeneratedReport[]; // TBD

        return this.reportWriter.writeBatch(reports);
    }

    private setRunResult(pageScanResult: OnDemandPageScanResult, state: OnDemandPageScanRunState, error?: string | ScanError): void {
        pageScanResult.run = {
            ...pageScanResult.run,
            state,
            timestamp: new Date().toJSON(),
            error: _.isString(error) ? error.substring(0, 2048) : error,
        };
    }
}
