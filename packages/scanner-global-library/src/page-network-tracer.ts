// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { GlobalLogger } from 'logger';
import { PageEventObject } from 'puppeteer';
import { System } from 'common';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NetworkTraceData {
    lastSequenceNumber: number;
    requests: {
        sequenceNumber: number;
        url: string;
        completed?: boolean;
    }[];
}

export interface PageEventHandler {
    name: string;
    eventHandler: any;
}

@injectable()
export class PageNetworkTracer {
    private pageEventHandlers: PageEventHandler[];

    private networkTraceData: NetworkTraceData;

    constructor(@inject(GlobalLogger) @optional() private readonly logger: GlobalLogger) {}

    public async addNetworkTrace(page: Puppeteer.Page): Promise<void> {
        this.init();
        await page.setRequestInterception(true);

        const pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                this.networkTraceData.requests.push({
                    sequenceNumber: this.networkTraceData.lastSequenceNumber++,
                    url: request.url(),
                });

                this.logger?.logInfo(`[Network] Processing URL`, { traceUrl: request.url() });

                if (!request.isInterceptResolutionHandled()) {
                    await request.continue();
                }
            } catch (error) {
                this.logger?.logError(`The 'request' page event handle failed`, {
                    traceUrl: request.url(),
                    error: System.serializeError(error),
                });
            }
        };
        this.setPageEventHandler('request', pageOnRequestEventHandler, page);

        const pageOnRequestFinishedEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                const response = request.response();
                const serverResponseTiming = response.timing()?.receiveHeadersEnd - response.timing()?.sendStart;
                const data = {
                    status: 'completed',
                    url: request.url(),
                    httpStatus: `${response.status()} ${response.statusText()}`,
                    requestHeaders: request.headers(),
                    responseHeaders: response.headers(),
                    serverResponseTiming,
                };
                const traceRequest = this.networkTraceData.requests.find((r) => r.url === request.url());
                if (traceRequest) {
                    traceRequest.completed = true;
                }

                this.logger?.logInfo(`[Network] Request completed`, { data: JSON.stringify(data, undefined, 2) });
                if (!request.isInterceptResolutionHandled()) {
                    await request.continue();
                }
            } catch (error) {
                this.logger?.logError(`The 'requestfinished' page event handle failed`, {
                    traceUrl: request.url(),
                    error: System.serializeError(error),
                });
            }
        };
        this.setPageEventHandler('requestfinished', pageOnRequestFinishedEventHandler, page);

        const pageOnRequestFailedEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                const response = request.response();
                const serverResponseTiming = response.timing()?.receiveHeadersEnd - response.timing()?.sendStart;
                const data = {
                    status: 'failed',
                    url: request.url(),
                    httpStatus: `${response?.status()} ${response?.statusText()}`,
                    requestHeaders: request.headers(),
                    responseHeaders: response?.headers(),
                    serverResponseTiming,
                };
                const traceRequest = this.networkTraceData.requests.find((r) => r.url === request.url());
                if (traceRequest) {
                    traceRequest.completed = true;
                }

                this.logger?.logInfo(`[Network] Request failed`, { data: JSON.stringify(data, undefined, 2) });
                if (!request.isInterceptResolutionHandled()) {
                    await request.continue();
                }
            } catch (error) {
                this.logger?.logError(`The 'requestfailed' page event handle failed`, {
                    traceUrl: request.url(),
                    error: System.serializeError(error),
                });
            }
        };
        this.setPageEventHandler('requestfailed', pageOnRequestFailedEventHandler, page);
    }

    public async removeNetworkTrace(page: Puppeteer.Page): Promise<void> {
        this.pageEventHandlers.map((handler) => page.removeListener(handler.name, handler.eventHandler));
        await page.setRequestInterception(false);
        this.logPendingRequests();
        this.logger?.logInfo(`[Network] Disable page network trace`);
    }

    private logPendingRequests(): void {
        const urls = this.networkTraceData.requests.filter((r) => r.completed !== true).map((r) => `${r.sequenceNumber}: ${r.url}`);
        if (urls.length > 0) {
            this.logger?.logWarn(`[Network] Pending requests`, {
                pendingRequests: JSON.stringify(urls, undefined, 2),
            });
        } else {
            this.logger?.logWarn(`[Network] No pending requests`);
        }
    }

    private setPageEventHandler(name: keyof PageEventObject, eventHandler: any, page: Puppeteer.Page): void {
        page.on(name, eventHandler);
        this.pageEventHandlers.push({
            name,
            eventHandler,
        });
    }

    private init(): void {
        this.logger?.logInfo(`[Network] Enable page network trace`);

        this.pageEventHandlers = [];
        this.networkTraceData = {
            lastSequenceNumber: 0,
            requests: [],
        };
    }
}
