// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults } from 'scanner-global-library';
import { OnDemandPageScanRunResultProvider, WebsiteScanResultProvider } from 'service-library';
import {
    OnDemandPageScanReport,
    OnDemandPageScanResult,
    OnDemandPageScanRunResult,
    OnDemandPageScanRunState,
    OnDemandScanResult,
    ScanError,
    WebsiteScanResult,
} from 'storage-documents';
import { System } from 'common';
import _ from 'lodash';
import { ReportGenerator } from '../report-generator/report-generator';
import { ScanMetadataConfig } from '../scan-metadata-config';
import { ScanRunnerTelemetryManager } from '../scan-runner-telemetry-manager';
import { CombinedScanResultProcessor } from '../combined-result/combined-scan-result-processor';
import { PageScanProcessor } from '../scanner/page-scan-processor';
import { ReportWriter } from '../report-generator/report-writer';
import { ScanMetadata } from '../types/scan-metadata';
import { ScanNotificationProcessor } from '../sender/scan-notification-processor';

@injectable()
export class Runner {
    constructor(
        @inject(ScanMetadataConfig) private readonly scanMetadataConfig: ScanMetadataConfig,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(WebsiteScanResultProvider) protected readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PageScanProcessor) private readonly pageScanProcessor: PageScanProcessor,
        @inject(ReportWriter) protected readonly reportWriter: ReportWriter,
        @inject(ReportGenerator) private readonly reportGenerator: ReportGenerator,
        @inject(CombinedScanResultProcessor) private readonly combinedScanResultProcessor: CombinedScanResultProcessor,
        @inject(ScanNotificationProcessor) protected readonly scanNotificationProcessor: ScanNotificationProcessor,
        @inject(ScanRunnerTelemetryManager) private readonly telemetryManager: ScanRunnerTelemetryManager,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async run(): Promise<void> {
        const scanMetadata = this.scanMetadataConfig.getConfig();
        this.logger.setCommonProperties({ scanId: scanMetadata.id, url: scanMetadata.url });
        this.logger.logInfo('Starting page scan task.');

        const pageScanResult = await this.updateScanRunState(scanMetadata.id);
        if (pageScanResult === undefined) {
            return;
        }

        this.telemetryManager.trackScanStarted(scanMetadata.id);
        try {
            const axeScanResults = await this.pageScanProcessor.scan(scanMetadata, pageScanResult);
            await this.processScanResult(axeScanResults, pageScanResult);
        } catch (error) {
            const errorMessage = System.serializeError(error);
            pageScanResult.run = this.createRunResult('failed', errorMessage);

            this.logger.logError(`The scanner failed to scan a page.`, { error: errorMessage });
            this.telemetryManager.trackScanTaskFailed();
        } finally {
            this.telemetryManager.trackScanCompleted();
        }

        const websiteScanResult = await this.updateScanResult(scanMetadata, pageScanResult);
        await this.scanNotificationProcessor.sendScanCompletionNotification(scanMetadata, pageScanResult, websiteScanResult);

        this.logger.logInfo('Page scan task completed.');
    }

    private async updateScanRunState(scanId: string): Promise<OnDemandPageScanResult> {
        this.logger.logInfo(`Updating page scan run state to 'running'.`);
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
                `Update page scan run state to 'running' failed due to merge conflict with other process. Exiting page scan task.`,
            );

            return undefined;
        }

        return response.result;
    }

    private async processScanResult(axeScanResults: AxeScanResults, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        if (_.isNil(axeScanResults.error)) {
            pageScanResult.run = this.createRunResult('completed');
            pageScanResult.scanResult = this.getScanStatus(axeScanResults);
            pageScanResult.reports = await this.generateScanReports(axeScanResults);
            if (axeScanResults.scannedUrl !== undefined) {
                pageScanResult.scannedUrl = axeScanResults.scannedUrl;
            }

            await this.combinedScanResultProcessor.generateCombinedScanResults(axeScanResults, pageScanResult);
        } else {
            pageScanResult.run = this.createRunResult('failed', axeScanResults.error);

            this.logger.logError('Browser has failed to scan a page.', { error: JSON.stringify(axeScanResults.error) });
            this.telemetryManager.trackBrowserScanFailed();
        }

        pageScanResult.run.pageTitle = axeScanResults.pageTitle;
        pageScanResult.run.pageResponseCode = axeScanResults.pageResponseCode;

        return axeScanResults.error ? undefined : axeScanResults;
    }

    private async updateScanResult(
        scanMetadata: ScanMetadata,
        pageScanResult: Partial<OnDemandPageScanResult>,
    ): Promise<WebsiteScanResult> {
        await this.onDemandPageScanRunResultProvider.updateScanRun(pageScanResult);

        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === 'deep-scan');
        if (websiteScanRef) {
            const updatedWebsiteScanResult: Partial<WebsiteScanResult> = {
                id: websiteScanRef.id,
                pageScans: [
                    {
                        scanId: scanMetadata.id,
                        url: scanMetadata.url,
                        scanState: pageScanResult.scanResult?.state,
                        runState: pageScanResult.run.state,
                        timestamp: new Date().toJSON(),
                    },
                ],
            };

            this.websiteScanResultProvider.mergeOrCreate(scanMetadata.id, updatedWebsiteScanResult);

            return this.websiteScanResultProvider.read(websiteScanRef.id, true);
        }

        return undefined;
    }

    private async generateScanReports(axeResults: AxeScanResults): Promise<OnDemandPageScanReport[]> {
        this.logger.logInfo(`Generating reports from scan results.`);
        const reports = this.reportGenerator.generateReports(axeResults);

        return this.reportWriter.writeBatch(reports);
    }

    private createRunResult(state: OnDemandPageScanRunState, error?: string | ScanError): OnDemandPageScanRunResult {
        return {
            state,
            timestamp: new Date().toJSON(),
            error: _.isString(error) ? error.substring(0, 2048) : error,
        };
    }

    private getScanStatus(axeResults: AxeScanResults): OnDemandScanResult {
        if (axeResults?.results?.violations !== undefined && axeResults.results.violations.length > 0) {
            return {
                state: 'fail',
                issueCount: axeResults.results.violations.reduce((a, b) => a + b.nodes.length, 0),
            };
        } else {
            return {
                state: 'pass',
            };
        }
    }
}
