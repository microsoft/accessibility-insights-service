// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { WebsiteScanDataProvider } from 'service-library';
import { KnownPage, OnDemandPageScanResult } from 'storage-documents';
import { isEmpty } from 'lodash';
import { ScanFeedGenerator } from './scan-feed-generator';

@injectable()
export class PageScanScheduler {
    constructor(
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanDataProvider) protected readonly websiteScanDataProvider: WebsiteScanDataProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async schedulePageScan(pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (pageScanResult.websiteScanRef.scanGroupType === 'single-scan') {
            return;
        }

        const websiteScanData = await this.websiteScanDataProvider.read(pageScanResult.websiteScanRef.id);
        this.logger.setCommonProperties({
            websiteScanId: websiteScanData.id,
            deepScanId: websiteScanData.deepScanId,
        });

        if (!(websiteScanData.knownPages as KnownPage[]).some((p) => isEmpty(p.scanId))) {
            this.logger.logInfo(`Did not find any known pages that require scanning.`);

            return;
        }

        await this.scanFeedGenerator.queueDiscoveredPages(websiteScanData, pageScanResult);
    }
}
