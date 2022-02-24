// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { QueuedRequest } from '../runner/request-selector';

@injectable()
export class ReportProcessor {
    public generate(queuedRequest: QueuedRequest[]): QueuedRequest[] {
        return queuedRequest;
    }
}
