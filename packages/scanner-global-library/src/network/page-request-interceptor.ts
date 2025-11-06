// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { isEmpty } from 'lodash';
import { InterceptedRequest, PageEventHandler } from './page-event-handler';
import { PageNetworkTracerHandler } from './page-network-tracer-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PuppeteerPageExt extends Puppeteer.Page {
    id?: string;
}

@injectable()
export class PageRequestInterceptor {
    public pageOnRequest: PageEventHandler;

    public pageOnResponse: PageEventHandler;

    public pageOnRequestFailed: PageEventHandler;

    public interceptedRequests: InterceptedRequest[];

    public errors: { message: string; error: any }[];

    private pageOnRequestEventHandler: (request: Puppeteer.HTTPRequest) => Promise<void>;

    private pageOnResponseEventHandler: (response: Puppeteer.HTTPResponse) => Promise<void>;

    private pageOnRequestFailedEventHandler: (request: Puppeteer.HTTPRequest) => Promise<void>;

    constructor(
        @inject(PageNetworkTracerHandler) private readonly pageNetworkTracerHandler: PageNetworkTracerHandler,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
        private readonly globalNetworkTrace: boolean = process.env.NETWORK_TRACE === 'true',
    ) {}

    public async intercept<T>(
        pageOperation: () => Promise<T>,
        page: Puppeteer.Page,
        timeoutMsec: number,
        networkTrace: boolean = false,
    ): Promise<T> {
        await this.enableInterception(page, networkTrace);
        const operationResult = await pageOperation();
        await this.waitForAllRequests(timeoutMsec);

        return operationResult;
    }

    /**
     * Intercepts only main frame navigational requests.
     */
    public async enableInterception(page: PuppeteerPageExt, networkTrace: boolean = false): Promise<void> {
        // Reset trace data
        this.errors = [];
        this.interceptedRequests = [];
        const networkTraceEnabled = networkTrace === true || this.globalNetworkTrace === true;

        // Adding event handlers to a new page only once
        if (isEmpty(page.id)) {
            page.id = (Math.random() + 1).toString(36);
        } else {
            return;
        }

        await page.setBypassServiceWorker(true);
        // Enable requests interception for a life duration of the page instance.
        // Disabling requests interception will break web page load.
        await page.setRequestInterception(true);

        this.pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                if (networkTraceEnabled === true || (request.isNavigationRequest() && request.frame() === page.mainFrame())) {
                    const interceptedRequest = { url: request.url(), interceptionId: (request as any)._interceptionId, request };
                    this.interceptedRequests.push(interceptedRequest);

                    if (networkTraceEnabled === true) {
                        await this.pageNetworkTracerHandler.getPageOnRequestHandler()(interceptedRequest);
                    }

                    if (this.pageOnRequest !== undefined) {
                        await this.pageOnRequest(interceptedRequest);
                    }
                }

                // Must resolve the interception to allow the request to proceed
                // This ensures the request can complete and trigger response/error events
                if (!request.isInterceptResolutionHandled()) {
                    await request.continue();
                }
            } catch (e) {
                this.traceError('request', e);
                // Ensure request is continued even if there's an error
                if (!request.isInterceptResolutionHandled()) {
                    try {
                        await request.continue();
                    } catch (continueError) {
                        this.logger?.logError('Failed to continue request after error', {
                            url: request.url(),
                            error: System.serializeError(continueError),
                        });
                    }
                }
            }
        };
        page.on('request', this.pageOnRequestEventHandler);

        this.pageOnResponseEventHandler = async (response: Puppeteer.HTTPResponse) => {
            try {
                const interceptedRequest = this.getInterceptedRequestByResponse(response);
                if (interceptedRequest !== undefined) {
                    interceptedRequest.response = response;

                    if (networkTraceEnabled === true) {
                        await this.pageNetworkTracerHandler.getPageOnResponseHandler()(interceptedRequest);
                    }

                    if (this.pageOnResponse !== undefined) {
                        await this.pageOnResponse(interceptedRequest);
                    }
                }
            } catch (e) {
                this.traceError('response', e);
            }
        };
        page.on('response', this.pageOnResponseEventHandler);

        this.pageOnRequestFailedEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                const interceptedRequest = this.getInterceptedRequestByRequest(request);
                if (interceptedRequest !== undefined) {
                    interceptedRequest.error = request.failure()?.errorText ?? 'unknown';

                    if (networkTraceEnabled === true) {
                        await this.pageNetworkTracerHandler.getPageOnRequestFailedHandler()(interceptedRequest);
                    }

                    if (this.pageOnRequestFailed !== undefined) {
                        await this.pageOnRequestFailed(interceptedRequest);
                    }
                }
            } catch (e) {
                this.traceError('requestFailed', e);
            }
        };
        page.on('requestfailed', this.pageOnRequestFailedEventHandler);
    }

    /**
     * Waits for all intercepted requests to complete (receive response or fail).
     * This is essential when using request interception to ensure all requests
     * in the browser redirection chain are completed before proceeding.
     * @returns Returns elapsed time, in msec.
     */
    public async waitForAllRequests(timeoutMsecs: number): Promise<number> {
        const timestamp = System.getTimestamp();
        await System.waitLoop(
            async () => {
                // Returns true if there are no pending requests
                // A request is considered complete when it has either:
                // 1. Received a response (r.response exists)
                // 2. Failed (r.error exists)
                // 3. Was resolved by request.continue(), request.abort(), or request.respond()
                const allCompleted = this.interceptedRequests.every((r) => r.response || r.error);

                if (!allCompleted) {
                    this.logger?.logVerbose(
                        `Waiting for ${
                            this.interceptedRequests.filter((r) => !r.response && !r.error).length
                        } pending requests to complete`,
                    );
                }

                return allCompleted;
            },
            async (requests) => requests,
            timeoutMsecs,
            1000,
        );

        return System.getElapsedTime(timestamp);
    }

    private traceError(eventName: string, error: any): void {
        const message = `Error handling '${eventName}' page event`;
        this.errors.push({ message, error });
        this.logger?.logError(message, { error: System.serializeError(error) });
    }

    private getInterceptedRequestByResponse(response: Puppeteer.HTTPResponse): InterceptedRequest {
        if (response === undefined) {
            return undefined;
        }

        return this.interceptedRequests.find(
            (r) =>
                r.url === response.url() &&
                (r.interceptionId === undefined || r.interceptionId === (response.request() as any)._interceptionId),
        );
    }

    private getInterceptedRequestByRequest(request: Puppeteer.HTTPRequest): InterceptedRequest {
        if (request === undefined) {
            return undefined;
        }

        return this.interceptedRequests.find(
            (r) => r.url === request.url() && (r.interceptionId === undefined || r.interceptionId === (request as any)._interceptionId),
        );
    }
}
