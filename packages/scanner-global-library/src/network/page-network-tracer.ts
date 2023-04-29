// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { System } from 'common';
import { puppeteerTimeoutConfig } from '../page-timeout-config';
import { PageEventHandler, PageRequestInterceptor } from './page-request-interceptor';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class PageNetworkTracer {
    private lastSequenceNumber: number;

    constructor(
        @inject(PageRequestInterceptor) private readonly pageRequestInterceptor: PageRequestInterceptor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async trace(url: string, page: Puppeteer.Page): Promise<void> {
        this.lastSequenceNumber = 0;

        this.logger?.logInfo(`[Network] Enable page network trace`);
        this.pageRequestInterceptor.pageOnRequest = this.getPageOnRequestHandler();
        this.pageRequestInterceptor.pageOnResponse = this.getPageOnResponseHandler();
        this.pageRequestInterceptor.pageOnRequestFailed = this.getPageOnRequestFailedHandler();
        await this.pageRequestInterceptor.intercept(
            async () => this.navigate(url, page),
            page,
            puppeteerTimeoutConfig.navigationTimeoutMsec,
            true,
        );
        this.logger?.logInfo(`[Network] Disable page network trace`);
    }

    private getPageOnRequestHandler(): PageEventHandler {
        return async (interceptedRequest) => {
            interceptedRequest.data = { sequenceNumber: this.lastSequenceNumber++ };
            this.logger?.logInfo(`[Network] Processing URL`, { traceUrl: interceptedRequest.url });
        };
    }

    private getPageOnResponseHandler(): PageEventHandler {
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

    private getPageOnRequestFailedHandler(): PageEventHandler {
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

    private async navigate(url: string, page: Puppeteer.Page): Promise<void> {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec });
        } catch (error) {
            this.logger?.logError(`Page network trace navigation error.`, {
                error: System.serializeError(error),
            });
        }
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
