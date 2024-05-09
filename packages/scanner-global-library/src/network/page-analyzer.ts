// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System, Url } from 'common';
import { GlobalLogger } from 'logger';
import { isNil } from 'lodash';
import { AuthenticationType } from 'storage-documents';
import { LoginPageDetector } from '../authenticator/login-page-detector';
import { NavigationResponse, PageOperationResult } from '../page-navigator';
import { PageResponseProcessor } from '../page-response-processor';
import { PuppeteerTimeoutConfig, PageNavigationTiming } from '../page-timeout-config';
import { PageRequestInterceptor } from './page-request-interceptor';
import { InterceptedRequest, PageEventHandler } from './page-event-handler';

export declare type RedirectionType = 'client' | 'server';

export interface PageAnalysisResult {
    url: string;
    navigationResponse: NavigationResponse;
    authentication?: boolean;
    authenticationType?: AuthenticationType;
    redirection?: boolean;
    redirectionType?: RedirectionType;
    loadedUrl?: string;
    loadTimeout?: boolean;
}

interface RedirectResult {
    redirection: boolean;
    redirectionType?: RedirectionType;
    loadedUrl: string;
}

interface LoadResult {
    loadTimeout: boolean;
    operationResult: PageOperationResult;
}

@injectable()
export class PageAnalyzer {
    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,
        @inject(PageRequestInterceptor) private readonly pageRequestInterceptor: PageRequestInterceptor,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async analyze(url: string, page: Puppeteer.Page): Promise<PageAnalysisResult> {
        const operationResult = await this.navigate(url, page);
        if (operationResult.error && operationResult.browserError?.errorType !== 'UrlNavigationTimeout') {
            return {
                url,
                navigationResponse: operationResult,
            };
        }

        const actualResponse = this.getActualResponse(operationResult);
        if (actualResponse.operationResult.response === undefined) {
            if (operationResult.browserError === undefined) {
                operationResult.browserError = {
                    errorType: 'NavigationError',
                    message: 'Page main frame request returned no response.',
                    stack: new Error().stack,
                };
            }

            return {
                url,
                navigationResponse: operationResult,
            };
        }

        const redirectResult = await this.detectRedirection(url, actualResponse.operationResult);
        const authenticationType = this.detectAuth(page);
        const result = {
            url,
            redirection: redirectResult.redirection,
            redirectionType: redirectResult.redirectionType,
            loadedUrl: redirectResult.loadedUrl,
            authentication: authenticationType !== undefined,
            authenticationType: authenticationType,
            loadTimeout: actualResponse.loadTimeout,
            navigationResponse: actualResponse.operationResult,
        };

        this.logger?.logInfo('Page analysis result.', {
            url,
            status: `${actualResponse.operationResult?.response?.status()}`,
            redirection: `${result.redirection}`,
            redirectionType: result.redirectionType,
            loadedUrl: result.loadedUrl,
            authentication: `${result.authentication}`,
            authenticationType: result.authenticationType,
            loadTimeout: `${result.loadTimeout}`,
            loadTime: `${actualResponse.operationResult?.navigationTiming?.goto}`,
        });

        return result;
    }

    private getActualResponse(operationResult: PageOperationResult): LoadResult {
        let actualResult: PageOperationResult;
        if (isNil(operationResult.response)) {
            // Puppeteer may fail to wait for all page's resources to complete however main frame request may succeeded.
            // Use last in chain main frame response to substitute page load result.
            let response;
            for (const interceptedRequest of this.pageRequestInterceptor.interceptedRequests) {
                if (interceptedRequest.response) {
                    response = interceptedRequest.response;
                }
            }

            actualResult = {
                ...operationResult,
                response,
            };
        } else {
            actualResult = operationResult;
        }

        const loadTimeout = operationResult.browserError?.errorType === 'UrlNavigationTimeout' && actualResult.response?.ok();
        if (loadTimeout === true) {
            // Reset timeout error if network response was received
            if (!isNil(actualResult.response)) {
                actualResult.browserError = undefined;
                actualResult.error = undefined;
            }
            this.logger?.logWarn('Page load timeout was detected.');
        }

        return {
            loadTimeout,
            operationResult: actualResult,
        };
    }

    private async detectRedirection(url: string, operationResult: PageOperationResult): Promise<RedirectResult> {
        let redirection = false;
        let redirectionType: RedirectionType;

        // Should compare encoded Urls
        const loadedUrl = encodeURI(operationResult.response.url());
        if (loadedUrl && encodeURI(url) !== loadedUrl) {
            redirection = true;
        }

        if (redirection) {
            const indirectRedirects = this.getIndirectRequests(url);
            redirectionType = indirectRedirects.length > 0 ? 'client' : 'server';

            this.logger?.logWarn('Page redirection was detected.', {
                redirectChain: JSON.stringify(this.pageRequestInterceptor.interceptedRequests.map((r) => r.url)),
                redirectionType,
                loadedUrl,
            });
        }

        return {
            redirection,
            redirectionType,
            loadedUrl,
        };
    }

    private detectAuth(page: Puppeteer.Page): AuthenticationType {
        const authenticationType = this.loginPageDetector.getAuthenticationType(page.url());
        if (authenticationType !== undefined) {
            this.logger?.logWarn('Page authentication was detected.', {
                authenticationType,
            });
        }

        return authenticationType;
    }

    private getIndirectRequests(originalUrl: string): InterceptedRequest[] {
        // Select server originated redirect
        const serverRedirects = this.pageRequestInterceptor.interceptedRequests
            .filter((r) => [301, 302, 303, 307, 308].includes(r.data?.status) && r.data?.location)
            .map((r) => r.data.location);
        // Exclude original URL
        serverRedirects.push(originalUrl);

        // Exclude server originated redirect
        return this.pageRequestInterceptor.interceptedRequests.filter((r) => !serverRedirects.includes(r.url));
    }

    private async navigate(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        this.pageRequestInterceptor.pageOnResponse = this.getPageOnResponseHandler(url);

        return this.pageRequestInterceptor.intercept(
            async () => this.navigatePage(url, page),
            page,
            PuppeteerTimeoutConfig.redirectTimeoutMsec,
        );
    }

    private async navigatePage(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        const timestamp = System.getTimestamp();
        try {
            this.logger?.logInfo('Navigate page to URL for analysis.');
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: PuppeteerTimeoutConfig.defaultNavigationTimeoutMsec,
            });

            return { response, navigationTiming: { goto: System.getElapsedTime(timestamp) } as PageNavigationTiming };
        } catch (error) {
            const browserError = this.pageResponseProcessor.getNavigationError(error as Error);
            this.logger?.logError(`Page analyzer navigation error.`, {
                error: System.serializeError(error),
                browserError: System.serializeError(browserError),
            });

            return {
                response: undefined,
                navigationTiming: { goto: System.getElapsedTime(timestamp) } as PageNavigationTiming,
                browserError,
                error,
            };
        }
    }

    private getPageOnResponseHandler(url: string): PageEventHandler {
        return async (interceptedRequest) => {
            let location;
            const locationHeader = interceptedRequest.response?.headers()?.location;
            if (locationHeader !== undefined) {
                location = Url.getAbsoluteUrl(locationHeader, url);
            }

            interceptedRequest.data = { status: interceptedRequest.response?.status(), location };
        };
    }
}
