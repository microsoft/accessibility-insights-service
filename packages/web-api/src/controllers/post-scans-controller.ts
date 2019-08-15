// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { System } from 'common';
import { ScanRunRequest } from '../api-contracts/scan-run-request';
import { ScanRunResponse } from '../api-contracts/scan-run-response';
import { ApiController } from './api-controller';

export class PostScansController extends ApiController {
    public readonly apiVersion = '1.0';

    protected invokeImpl(): void {
        if (!this.hasPayload()) {
            this.context.res = {
                status: 204, // No Content
            };
        } else {
            const payload = this.tryGetPayload<ScanRunRequest[]>();
            if (payload.hasValue) {
                const response = this.createMockResponse(payload.value);
                this.context.res = {
                    status: 202, // Accepted
                    body: response,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
            }
        }
    }

    private createMockResponse(requests: ScanRunRequest[]): ScanRunResponse[] {
        const response: ScanRunResponse[] = [];
        requests.map(request =>
            response.push({
                url: request.url,
                scanId: System.createRandomString(),
            }),
        );

        if (response.length > 1) {
            const last = response.pop();
            response.push({
                url: last.url,
                error: 'An error occurred while processing your request',
            });
        }

        return response;
    }
}
