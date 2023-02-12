// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { RunnerScanMetadata } from 'service-library';
import { isEmpty } from 'lodash';
import { AxeScanner } from '../scanner/axe-scanner';
import { DeepScanner } from './deep-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(runnerScanMetadata: RunnerScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            const enableAuthentication = pageScanResult.authentication?.hint !== undefined;
            await this.openPage(runnerScanMetadata.url, enableAuthentication);
            if (enableAuthentication === true) {
                this.setAuthenticationResult(pageScanResult);
            }

            if (!isEmpty(this.page.lastBrowserError)) {
                return { error: this.page.lastBrowserError, pageResponseCode: this.page.lastBrowserError.statusCode };
            }

            const pageState = await this.capturePageState();
            axeScanResults = await this.axeScanner.scan(this.page);
            axeScanResults = { ...axeScanResults, ...pageState };

            if (runnerScanMetadata.deepScan) {
                if (this.page.isOpen()) {
                    await this.deepScanner.runDeepScan(runnerScanMetadata, pageScanResult, this.page);
                    this.logger.logInfo('The deep scanner completed a page scan.');
                } else {
                    this.logger.logError('Page is not ready. Unable to perform deep scan.');
                }
            }
        } finally {
            await this.closePage();
        }

        return axeScanResults;
    }

    private async capturePageState(): Promise<AxeScanResults> {
        const pageScreenshot = await this.page.getPageScreenshot();
        const pageSnapshot = await this.page.getPageSnapshot();

        return {
            pageSnapshot,
            pageScreenshot,
        };
    }

    private async openPage(url: string, enableAuthentication: boolean): Promise<void> {
        await this.page.create();
        await this.page.navigate(url, { enableAuthentication });
    }

    private async closePage(): Promise<void> {
        try {
            await this.page.close();
        } catch (error) {
            this.logger.logError('An error occurred while closing web browser.', { error: System.serializeError(error) });
        }
    }

    private setAuthenticationResult(pageScanResult: OnDemandPageScanResult): void {
        const authenticationResult = this.page.lastAuthenticationResult;
        if (authenticationResult === undefined) {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                state: 'notDetected',
            };
        } else {
            pageScanResult.authentication = {
                ...pageScanResult.authentication,
                detected: authenticationResult.authenticationType,
                state: authenticationResult.authenticated === true ? 'succeeded' : 'failed',
            };
        }
    }
}
