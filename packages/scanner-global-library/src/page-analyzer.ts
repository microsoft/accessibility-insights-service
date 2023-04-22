// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System, Url } from 'common';
import { GlobalLogger } from 'logger';
import { NavigationResponse, PageOperationResult } from './page-navigator';
import { PageNavigationTiming, puppeteerTimeoutConfig } from './page-timeout-config';
import { PageResponseProcessor } from './page-response-processor';
import { LoginPageDetector } from './authenticator/login-page-detector';

export interface PageAnalysisResult {
    authentication: boolean;
    redirection: boolean;
    navigationResponse: NavigationResponse;
}

interface RedirectRequest {
    url: string;
    status?: number;
    location?: string;
    error?: string;
}

interface RedirectResult {
    redirection: boolean;
    operationResult: PageOperationResult;
}

@injectable()
export class PageAnalyzer {
    private redirectRequest: RedirectRequest[];

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async analyze(url: string, page: Puppeteer.Page): Promise<PageAnalysisResult> {
        const redirectResult = await this.detectRedirection(url, page);
        const authResult = this.detectAuth(page);

        return {
            redirection: redirectResult.redirection,
            authentication: authResult,
            navigationResponse: redirectResult.operationResult,
        };
    }

    private detectAuth(page: Puppeteer.Page): boolean {
        let authDetected = false;
        const loginPageType = this.loginPageDetector.getLoginPageType(page.url());
        if (loginPageType !== undefined) {
            authDetected = true;
            this.logger?.logWarn('Page authentication was detected.', {
                loginPageType,
            });
        }

        return authDetected;
    }

    private async detectRedirection(url: string, page: Puppeteer.Page): Promise<RedirectResult> {
        this.redirectRequest = [];

        await page.setRequestInterception(true);
        const pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                // Trace only main frame navigational requests
                if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                    this.redirectRequest.push({ url: request.url() });
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'request' page event`, { error: System.serializeError(e) });
            }

            await request.continue();
        };
        page.on('request', pageOnRequestEventHandler);

        const pageOnResponseEventHandler = async (response: Puppeteer.HTTPResponse) => {
            try {
                const pendingRequest = this.redirectRequest.find((r) => r.url === response.url());
                if (pendingRequest !== undefined) {
                    pendingRequest.status = response.status();
                    const locationHeader = response.headers()?.location;
                    if (locationHeader !== undefined) {
                        pendingRequest.location = Url.getAbsoluteUrl(locationHeader, url);
                    }
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'response' page event`, { error: System.serializeError(e) });
            }
        };
        page.on('response', pageOnResponseEventHandler);

        const pageOnRequestFailedEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                const pendingRequest = this.redirectRequest.find((r) => r.url === request.url());
                if (pendingRequest !== undefined) {
                    pendingRequest.error = request.failure()?.errorText ?? 'unknown';
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'requestFailed' page event`, { error: System.serializeError(e) });
            }
        };
        page.on('requestfailed', pageOnRequestFailedEventHandler);

        const operationResult = await this.navigate(url, page);

        await System.waitLoop(
            async () => {
                // returns if there is no pending requests
                return this.redirectRequest.every((r) => r.status || r.error);
            },
            async (noPendingRequests) => noPendingRequests,
            puppeteerTimeoutConfig.redirectTimeoutMsecs,
            this.getTimeout(),
        );

        page.off('request', pageOnRequestEventHandler);
        page.off('response', pageOnResponseEventHandler);
        page.off('requestfailed', pageOnRequestFailedEventHandler);
        await page.setRequestInterception(false);

        const indirectRedirect = this.getIndirectRedirect(url);
        if (indirectRedirect.length > 0) {
            this.logger?.logWarn('Page indirect redirection was detected.', {
                redirect: JSON.stringify(indirectRedirect.map((r) => r.url)),
            });
        }

        return {
            redirection: indirectRedirect.length > 0,
            operationResult,
        };
    }

    private async navigate(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        try {
            const timestamp = System.getTimestamp();
            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsecs });

            return { response, navigationTiming: { goto1: System.getElapsedTime(timestamp) } as PageNavigationTiming };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);
            this.logger?.logError(`Page analyzer navigation error.`, {
                error: System.serializeError(error),
                browserError: System.serializeError(browserError),
            });

            return { response: undefined, browserError, error };
        }
    }

    private getIndirectRedirect(url: string): RedirectRequest[] {
        // Select server originated redirect
        const serverRedirects = this.redirectRequest
            .filter((r) => [301, 302, 303, 307, 308].includes(r.status) && r.location)
            .map((r) => r.location);
        // Exclude original URL
        serverRedirects.push(url);

        // Exclude server originated redirect
        return this.redirectRequest.filter((r) => !serverRedirects.includes(r.url));
    }

    private getTimeout(): number {
        // Reduce wait time when debugging
        return System.isDebugEnabled() === true ? 1500 : 5000;
    }
}
