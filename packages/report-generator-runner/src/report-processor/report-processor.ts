// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject } from 'inversify';
import { GlobalLogger } from 'logger';
import { QueuedRequest } from '../runner/request-selector';

@injectable()
export class ReportProcessor {
    constructor(@inject(GlobalLogger) private readonly logger: GlobalLogger) {}

    public generate(queuedRequest: QueuedRequest[]): QueuedRequest[] {
        return queuedRequest.map((r) => {
            this.logger.logInfo(`Generating report for ${r.request.scanGroupId} report group id.`);

            return {
                ...r,
                condition: 'completed',
            };
        });
    }
}
