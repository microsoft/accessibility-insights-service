// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { InterceptedRequest, PageEventHandler } from './page-event-handler';
import { PageNetworkTracerHandler } from './page-network-tracer-handler';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    private interceptionEnabled = false;

    private session: Puppeteer.CDPSession;

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
        await this.disableInterception(page);

        return operationResult;
    }

    /**
     * Intercepts only main frame navigational requests.
     */
    public async enableInterception(page: Puppeteer.Page, networkTrace: boolean = false): Promise<void> {
        if (this.interceptionEnabled === true) {
            return;
        }

        const networkTraceEnabled = networkTrace === true || this.globalNetworkTrace === true;

        this.interceptionEnabled = true;
        this.interceptedRequests = [];
        this.errors = [];

        await this.enableBypassServiceWorker(page);
        await page.setRequestInterception(true);

        this.pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                if (networkTraceEnabled === true || (request.isNavigationRequest() && request.frame() === page.mainFrame())) {
                    const interceptedRequest = { url: request.url(), request };
                    this.interceptedRequests.push(interceptedRequest);

                    if (networkTraceEnabled === true) {
                        await this.pageNetworkTracerHandler.getPageOnRequestHandler()(interceptedRequest);
                    }

                    if (this.pageOnRequest !== undefined) {
                        await this.pageOnRequest(interceptedRequest);
                    }
                }

                if (!request.isInterceptResolutionHandled()) {
                    await request.continue();
                }
            } catch (e) {
                this.traceError('request', e);
            }
        };
        page.on('request', this.pageOnRequestEventHandler);

        this.pageOnResponseEventHandler = async (response: Puppeteer.HTTPResponse) => {
            try {
                const interceptedRequest = this.interceptedRequests.find((r) => r.url === response.url());
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
                const interceptedRequest = this.interceptedRequests.find((r) => r.url === request.url());
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

    public async disableInterception(page: Puppeteer.Page): Promise<void> {
        if (this.interceptionEnabled === false) {
            return;
        }

        if (this.pageOnRequestEventHandler) {
            page.off('request', this.pageOnRequestEventHandler);
        }

        if (this.pageOnResponseEventHandler) {
            page.off('response', this.pageOnResponseEventHandler);
        }

        if (this.pageOnRequestFailedEventHandler) {
            page.off('requestfailed', this.pageOnRequestFailedEventHandler);
        }

        await this.disableBypassServiceWorker();
        await page.setRequestInterception(false);
        this.interceptionEnabled = false;
    }

    /**
     *
     * @returns Returns elapsed time, in msec.
     */
    public async waitForAllRequests(timeoutMsecs: number): Promise<number> {
        const timestamp = System.getTimestamp();
        await System.waitLoop(
            async () => {
                // returns if there is no pending requests
                return this.interceptedRequests.every((r) => r.response || r.error);
            },
            async (requests) => requests,
            timeoutMsecs,
            2000,
        );

        return System.getElapsedTime(timestamp);
    }

    private async disableBypassServiceWorker(): Promise<void> {
        if (this.session === undefined) {
            return;
        }

        await this.session.send('Network.disable');
        await this.session.send('Network.setBypassServiceWorker', { bypass: false });
        await this.session.detach();
        this.session = undefined;
    }

    private async enableBypassServiceWorker(page: Puppeteer.Page): Promise<void> {
        this.session = await page.target().createCDPSession();
        await this.session.send('Network.enable');
        await this.session.send('Network.setBypassServiceWorker', { bypass: true });
    }

    private traceError(eventName: string, error: any): void {
        const message = `Error handling '${eventName}' page event`;
        this.errors.push({ message, error });
        this.logger?.logError(message, { error: System.serializeError(error) });
    }
}
