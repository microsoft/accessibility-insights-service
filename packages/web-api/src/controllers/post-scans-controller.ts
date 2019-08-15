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
                body: [],
            };
        } else {
            const payload = this.tryGetPayload<ScanRunRequest[]>();
            if (payload.hasValue) {
                const response = this.createResponse(payload.value);
                this.context.res = {
                    status: 202, // Accepted
                    body: response,
                };
            }
        }
    }

    private createResponse(requests: ScanRunRequest[]): ScanRunResponse[] {
        const response: ScanRunResponse[] = [];
        requests.map(request =>
            response.push({
                url: request.url,
                scanId: System.createRandomString(),
            }),
        );

        return response;
    }
}
