// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { Logger } from 'logger';
import { ApiController } from 'service-library';
import { ItemType, OnDemandPageScanBatchRequest } from 'storage-documents';

@injectable()
export class ScanBatchRequestFeedController extends ApiController {
    public readonly apiVersion = '1.0';
    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    // tslint:disable-next-line: no-any
    public async handleRequest(...args: any[]): Promise<void> {
        const documents = <OnDemandPageScanBatchRequest[]>args[0];
        if (!this.validateRequestData(documents)) {
            return;
        }

        return;
    }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some(d => d.itemType === ItemType.scanRunBatchRequest)) {
            return false;
        }

        return true;
    }
}
