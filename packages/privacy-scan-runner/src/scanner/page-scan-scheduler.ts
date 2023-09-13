// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult } from 'storage-documents';
import { ScanFeedGenerator } from './scan-feed-generator';

@injectable()
export class PageScanScheduler {
    constructor(
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async schedulePageScan(pageScanResult: OnDemandPageScanResult): Promise<void> {
        if (pageScanResult.websiteScanRef === undefined || pageScanResult.websiteScanRef.scanGroupType === 'single-scan') {
            return;
        }

        let websiteScanResult = await this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id, false);
        this.logger.setCommonProperties({
            websiteScanId: websiteScanResult.id,
            deepScanId: websiteScanResult.deepScanId,
        });

        if (websiteScanResult.pageCount > 1) {
            this.logger.logInfo(`Skip known privacy pages scan scheduling since scan was already scheduled.`, {
                privacyUrls: `${websiteScanResult.pageCount}`,
            });

            return;
        }

        // fetch websiteScanResult.knownPages from a storage
        websiteScanResult = await this.websiteScanResultProvider.read(pageScanResult.websiteScanRef.id, true);
        await this.scanFeedGenerator.queuePrivacyPages(websiteScanResult, pageScanResult);
    }
}
