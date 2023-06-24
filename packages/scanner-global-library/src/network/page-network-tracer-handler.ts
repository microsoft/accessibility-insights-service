// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageEventHandler } from './page-event-handler';

@injectable()
export class PageNetworkTracerHandler {
    constructor(@inject(GlobalLogger) @optional() private readonly logger: GlobalLogger) {}

    public getPageOnRequestHandler(): PageEventHandler {
        return async (interceptedRequest) => {
            this.logger?.logInfo(`[Network] Processing URL`, { traceUrl: interceptedRequest.url });
        };
    }

    public getPageOnResponseHandler(): PageEventHandler {
        return async (interceptedRequest) => {
            const serverResponseTiming =
                interceptedRequest.response.timing()?.receiveHeadersEnd - interceptedRequest.response.timing()?.sendStart;
            const requestHeaders = this.sanitizeHeaders(interceptedRequest.request.headers());
            const data = {
                status: 'completed',
                url: interceptedRequest.url,
                httpStatus: `${interceptedRequest.response.status()} ${interceptedRequest.response.statusText()}`,
                requestHeaders: requestHeaders,
                responseHeaders: interceptedRequest.response.headers(),
                serverResponseTiming,
            };
            this.logger?.logInfo(`[Network] Request completed`, {
                status: 'completed',
                traceUrl: data.url,
                httpStatus: data.httpStatus,
                serverResponseTiming: `${serverResponseTiming}`,
                data: JSON.stringify(data, undefined, 2),
            });
        };
    }

    public getPageOnRequestFailedHandler(): PageEventHandler {
        return async (interceptedRequest) => {
            const serverResponseTiming =
                interceptedRequest.response?.timing()?.receiveHeadersEnd - interceptedRequest.response?.timing()?.sendStart;
            const requestHeaders = this.sanitizeHeaders(interceptedRequest.request.headers());
            const data = {
                status: 'failed',
                url: interceptedRequest.url,
                httpStatus: `${interceptedRequest.response?.status()} ${interceptedRequest.response?.statusText()}`,
                requestHeaders: requestHeaders,
                responseHeaders: interceptedRequest.response?.headers(),
                serverResponseTiming,
            };
            this.logger?.logWarn(`[Network] Request failed`, {
                status: 'failed',
                traceUrl: data.url,
                httpStatus: data.httpStatus,
                serverResponseTiming: `${serverResponseTiming}`,
                data: JSON.stringify(data, undefined, 2),
            });
        };
    }

    private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
        const list: Record<string, string> = {};
        Object.keys(headers).forEach((key) => {
            if (key !== 'authorization') {
                list[key] = headers[key];
            }
        });

        return list;
    }
}
