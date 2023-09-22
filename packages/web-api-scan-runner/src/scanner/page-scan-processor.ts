// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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
        @inject(GlobalLogger) public readonly logger: GlobalLogger,
    ) {}

    public async scan(runnerScanMetadata: RunnerScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            const enableAuthentication = pageScanResult.authentication?.hint !== undefined;
            await this.page.navigate(runnerScanMetadata.url, { enableAuthentication });

            if (enableAuthentication === true) {
                this.setAuthenticationResult(pageScanResult);
            }

            if (!isEmpty(this.page.browserError)) {
                return { error: this.page.browserError, pageResponseCode: this.page.browserError.statusCode };
            }

            const pageState = await this.capturePageState();
            axeScanResults = await this.axeScanner.scan(this.page);
            axeScanResults = { ...axeScanResults, ...pageState };

            await this.deepScanner.runDeepScan(runnerScanMetadata, pageScanResult, this.page);
        } finally {
            await this.page.close();
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

    private setAuthenticationResult(pageScanResult: OnDemandPageScanResult): void {
        const authenticationResult = this.page.authenticationResult;
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
