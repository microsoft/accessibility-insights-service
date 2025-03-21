// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { DeepScanner, RunnerScanMetadata } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { HighContrastResults, HighContrastScanner } from '../scanner/high-contrast-scanner';
import { ScanProcessorResult } from '../processor/page-scan-processor';
import { AgentResults, AgentScanner } from './agent-scanner';

export const conditionsToDispatchScanner = ['pending', 'error'] as string[];

@injectable()
export class ScannerDispatcher {
    public constructor(
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(HighContrastScanner) private readonly highContrastScanner: HighContrastScanner,
        @inject(AgentScanner) private readonly agentScanner: AgentScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    /**
     * Dispatches the request to the appropriate scanners and returns the results.
     * Note: The call will dispose of the `page` object after the scan is complete.
     * @param runnerScanMetadata - Runner scan metadata.
     * @param pageScanResult - Page scan result.
     * @param websiteScanData - Website scan data.
     * @param page - Page object.
     */
    public async dispatch(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanData,
        page: Page,
    ): Promise<ScanProcessorResult> {
        const axeScanResults = await this.dispatchAccessibilityScan(pageScanResult, websiteScanData, page);
        const highContrastResults = await this.dispatchHighContrastScan(runnerScanMetadata, pageScanResult);
        const agentResults = await this.dispatchAgentScan(runnerScanMetadata, pageScanResult);

        return {
            axeScanResults,
            ...(isEmpty(highContrastResults) ? {} : { browserValidationResult: { highContrastProperties: highContrastResults.result } }),
            ...(isEmpty(agentResults) ? {} : { agentResults }),
        };
    }

    private async dispatchAccessibilityScan(
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanData,
        page: Page,
    ): Promise<AxeScanResults> {
        try {
            this.logger.logInfo(`Dispatching accessibility website page scanner.`);

            let axeScanResults = await this.axeScanner.scan(page);
            await this.deepScanner.runDeepScan(pageScanResult, websiteScanData, page);

            // Capturing a screenshot of the page may disrupt the page layout. Perform this action at the end of the page lifecycle.
            const pageState = await page.capturePageState();
            axeScanResults = { ...axeScanResults, ...pageState };

            return axeScanResults;
        } finally {
            await page.close();
        }
    }

    private async dispatchHighContrastScan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
    ): Promise<HighContrastResults> {
        // Preventing the execution of a scanner on retry that was initiated due to the failure of another scanner.
        if (conditionsToDispatchScanner.includes(pageScanResult.browserValidationResult?.highContrastProperties)) {
            this.logger.logInfo(`Dispatching high contrast website page scanner.`);

            return this.highContrastScanner.scan(runnerScanMetadata.url);
        }

        return undefined;
    }

    private async dispatchAgentScan(runnerScanMetadata: RunnerScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<AgentResults> {
        // Preventing the execution of a scanner on retry that was initiated due to the failure of another scanner.
        // if (conditionsToDispatchScanner.includes(pageScanResult.run.scanRunDetails?
        // .find((s) => s.name === 'accessibility-agent')?.state)) {

        // TODO Temporary execute the agent scanner on every run until the retry logic is implemented.
        if (pageScanResult.run.scanRunDetails?.find((s) => s.name === 'accessibility-agent') !== undefined) {
            // Scan only for the original client request and disregard internal crawler requests. For
            // supporting crawler requests, ensure that the relevant request portion is duplicated by
            // the scan feed generator.
            this.logger.logInfo(`Dispatching accessibility agent scanner.`);

            return this.agentScanner.scan(runnerScanMetadata.url);
        }

        return undefined;
    }
}
