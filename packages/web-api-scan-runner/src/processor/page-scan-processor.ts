// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { BrowserValidationResult, OnDemandPageScanResult, WebsiteScanData } from 'storage-documents';
import { DeepScanner, PageMetadata, PageMetadataGenerator, RunnerScanMetadata } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeScanner } from './axe-scanner';
import { HighContrastScanner } from './high-contrast-scanner';

export interface ScanProcessorResult {
    axeScanResults: AxeScanResults;
    browserValidationResult?: BrowserValidationResult;
}

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(HighContrastScanner) private readonly highContrastScanner: HighContrastScanner,
        @inject(PageMetadataGenerator) private readonly pageMetadataGenerator: PageMetadataGenerator,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(
        runnerScanMetadata: RunnerScanMetadata,
        pageScanResult: OnDemandPageScanResult,
        websiteScanData: WebsiteScanData,
    ): Promise<ScanProcessorResult> {
        try {
            const pageMetadata = await this.pageMetadataGenerator.getMetadata(runnerScanMetadata.url, this.page, websiteScanData);
            const state = this.getScannableState(pageMetadata);
            if (state.unscannable === true) {
                this.setAuthenticationResult(pageMetadata, pageScanResult);

                return { axeScanResults: state };
            }

            // Turn on WebGL to show all page elements and get a complete accessibility scan result
            await this.page.reopenBrowser({ capabilities: { webgl: true } });
            const enableAuthentication = pageScanResult.authentication?.hint !== undefined;
            await this.page.navigate(runnerScanMetadata.url, { enableAuthentication });
            this.setAuthenticationResult(pageMetadata, pageScanResult);
            if (!isEmpty(this.page.browserError)) {
                return {
                    axeScanResults: {
                        error: this.page.browserError,
                        pageResponseCode: this.page.browserError.statusCode,
                    },
                };
            }

            let axeScanResults = await this.axeScanner.scan(this.page);
            await this.deepScanner.runDeepScan(pageScanResult, websiteScanData, this.page);

            // Taking a screenshot of the page might break the page layout. Run at the end of the workflow.
            const pageState = await this.page.capturePageState();
            axeScanResults = { ...axeScanResults, ...pageState };

            // Execute additional scanners once the primary scan is finished.
            let highContrastResult;
            if (['pending', 'error'].includes(pageScanResult.browserValidationResult?.highContrastProperties)) {
                highContrastResult = await this.highContrastScanner.scan(runnerScanMetadata.url);
            }

            return {
                axeScanResults,
                ...(isEmpty(highContrastResult) ? {} : { browserValidationResult: { highContrastProperties: highContrastResult.result } }),
            };
        } finally {
            await this.page.close();
        }
    }

    private getScannableState(pageMetadata: PageMetadata): AxeScanResults {
        if (pageMetadata.browserError !== undefined) {
            this.logger.logError(pageMetadata.browserError.message, {
                loadedUrl: pageMetadata.loadedUrl,
            });

            return {
                unscannable: true,
                scannedUrl: pageMetadata.loadedUrl,
                error: pageMetadata.browserError,
            };
        }

        return {
            unscannable: false,
            scannedUrl: pageMetadata.loadedUrl,
        };
    }

    private setAuthenticationResult(pageMetadata: PageMetadata, pageScanResult: OnDemandPageScanResult): void {
        if (pageMetadata.authentication !== true) {
            return;
        }

        const authenticationResult = this.page.authenticationResult;
        if (authenticationResult !== undefined) {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                detected: pageMetadata.authenticationType,
                state: authenticationResult.authenticated === true ? 'succeeded' : 'failed',
            };
        } else {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                detected: pageMetadata.authenticationType,
                state: 'unauthenticated',
            };
        }
    }
}
