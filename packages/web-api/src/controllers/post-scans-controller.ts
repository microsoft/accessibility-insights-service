// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanRunResponse } from '../api-contracts/scan-run-response';
import { ApiController } from './api-controller';

export class PostScansController extends ApiController {
    public readonly apiVersion = '1.0';

    protected invokeImpl(): void {
        const response: ScanRunResponse[] = [];
        if (!this.hasPayload()) {
            this.context.res = {
                status: 204, // No Content
                body: [],
            };
        } else {
            response.push({
                url: 'url',
                scanId: 'scanId',
            });

            this.context.res = {
                status: 202, // Accepted
                body: response,
            };
        }
    }
}
