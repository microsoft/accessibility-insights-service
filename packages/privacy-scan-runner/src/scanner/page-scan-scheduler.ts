// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { GlobalLogger } from 'logger';
import { WebsiteScanResultProvider } from 'service-library';
import { OnDemandPageScanResult, WebsiteScanResult } from 'storage-documents';
import { ScanFeedGenerator } from './scan-feed-generator';

@injectable()
export class PageScanScheduler {
    constructor(
        @inject(ScanFeedGenerator) private readonly scanFeedGenerator: ScanFeedGenerator,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async schedulePageScan(pageScanResult: OnDemandPageScanResult): Promise<void> {
        let websiteScanResult = await this.readWebsiteScanResult(pageScanResult, false);
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
        websiteScanResult = await this.readWebsiteScanResult(pageScanResult, true);
        await this.scanFeedGenerator.queuePrivacyPages(websiteScanResult, pageScanResult);
    }

    private async readWebsiteScanResult(pageScanResult: OnDemandPageScanResult, readCompleteDocument: boolean): Promise<WebsiteScanResult> {
        const scanGroupType = 'deep-scan';
        const websiteScanRef = pageScanResult.websiteScanRefs?.find((ref) => ref.scanGroupType === scanGroupType);
        if (isNil(websiteScanRef)) {
            this.logger.logError(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);

            throw new Error(`No websiteScanRef exists with scanGroupType ${scanGroupType}`);
        }

        return this.websiteScanResultProvider.read(websiteScanRef.id, readCompleteDocument);
    }
}
