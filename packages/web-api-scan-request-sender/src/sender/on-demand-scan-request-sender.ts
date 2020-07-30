// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Queue, StorageConfig } from 'azure-services';
import { inject, injectable } from 'inversify';
import { isNil } from 'lodash';
import { ContextAwareLogger } from 'logger';
import { OnDemandPageScanRunResultProvider, PageScanRequestProvider } from 'service-library';
import {
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    OnDemandPageScanRunState,
    OnDemandScanRequestMessage,
    ScanError,
} from 'storage-documents';

@injectable()
export class OnDemandScanRequestSender {
    constructor(
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(Queue) private readonly queue: Queue,
        @inject(StorageConfig) private readonly storageConfig: StorageConfig,
        @inject(ContextAwareLogger) private readonly logger: ContextAwareLogger,
    ) {}

    public async sendRequestToScan(onDemandPageScanRequests: OnDemandPageScanRequest[]): Promise<void> {
        await Promise.all(
            onDemandPageScanRequests.map(async (page) => {
                const resultDocs = await this.onDemandPageScanRunResultProvider.readScanRuns([page.id]);
                const resultDoc = resultDocs.pop();
                if (resultDoc !== undefined && resultDoc.run !== undefined && resultDoc.run.state === 'accepted') {
                    this.logger.logInfo('Sending scan request to the scan task queue.', { scanId: resultDoc.id });
                    const message = this.createOnDemandScanRequestMessage(page);
                    const isEnqueueSuccessful = await this.queue.createMessage(this.storageConfig.scanQueue, message);
                    if (isEnqueueSuccessful === true) {
                        await this.updateOnDemandPageResultDoc(resultDoc, 'queued');
                    } else {
                        const error: ScanError = {
                            errorType: 'InternalError',
                            message: 'Failed to create scan message in a queue.',
                        };
                        await this.updateOnDemandPageResultDoc(resultDoc, 'failed', error);
                        this.logger.logError('Failed to add scan request to the scan task queue.', {
                            scanId: resultDoc.id,
                        });
                    }
                } else {
                    this.logger.logWarn('Scan request state is not valid for adding to the scan task queue.', {
                        scanId: resultDoc.id,
                    });
                }

                await this.pageScanRequestProvider.deleteRequests([page.id]);
            }),
        );
    }

    public async getCurrentQueueSize(): Promise<number> {
        return this.queue.getMessageCount(this.storageConfig.scanQueue);
    }

    private async updateOnDemandPageResultDoc(
        resultDoc: OnDemandPageScanResult,
        state: OnDemandPageScanRunState,
        error?: ScanError,
    ): Promise<void> {
        resultDoc.run.state = state;
        resultDoc.run.timestamp = new Date().toJSON();
        if (!isNil(error)) {
            resultDoc.run.error = error;
        }

        await this.onDemandPageScanRunResultProvider.writeScanRuns([resultDoc]);
    }

    private createOnDemandScanRequestMessage(scanRequest: OnDemandPageScanRequest): OnDemandScanRequestMessage {
        return {
            id: scanRequest.id,
            url: scanRequest.url,
        };
    }
}
