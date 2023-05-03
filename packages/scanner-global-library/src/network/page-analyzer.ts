// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System, Url } from 'common';
import { GlobalLogger } from 'logger';
import { LoginPageDetector } from '../authenticator/login-page-detector';
import { NavigationResponse, PageOperationResult } from '../page-navigator';
import { PageResponseProcessor } from '../page-response-processor';
import { puppeteerTimeoutConfig, PageNavigationTiming } from '../page-timeout-config';
import { PageRequestInterceptor, InterceptedRequest, PageEventHandler } from './page-request-interceptor';

export interface PageAnalysisResult {
    authentication: boolean;
    redirection: boolean;
    loadTimeout: boolean;
    navigationResponse: NavigationResponse;
}

interface RedirectResult {
    redirection: boolean;
    navigationResult: PageOperationResult;
    lastHttpResponse?: Puppeteer.HTTPResponse;
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
        const redirectResult = await this.detectRedirection(url, page);
        const authResult = this.detectAuth(page);
        const loadTimeoutResult = this.detectLoadTimeout(redirectResult);
        const result = {
            redirection: redirectResult.redirection,
            authentication: authResult,
            loadTimeout: loadTimeoutResult.loadTimeout,
            navigationResponse: loadTimeoutResult.operationResult,
        };

        this.logger?.logInfo('Page analysis result.', {
            authentication: `${result.authentication}`,
            loadTimeout: `${result.loadTimeout}`,
            redirection: `${result.redirection}`,
            loadTime: `${redirectResult.navigationResult?.navigationTiming?.goto}`,
        });

        return result;
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

    private detectLoadTimeout(redirectResult: RedirectResult): { loadTimeout: boolean; operationResult: PageOperationResult } {
        // Puppeteer has failed waiting for all page's resources to complete however main frame request succeeded.
        // Use main frame response as successful page load result substitution.
        const loadTimeout =
            redirectResult.navigationResult.browserError?.errorType === 'UrlNavigationTimeout' && redirectResult.lastHttpResponse?.ok();
        const operationResult =
            loadTimeout === true
                ? {
                      response: redirectResult.lastHttpResponse,
                      navigationTiming: { goto: puppeteerTimeoutConfig.navigationTimeoutMsec, gotoTimeout: true } as PageNavigationTiming,
                  }
                : redirectResult.navigationResult;

        if (loadTimeout === true) {
            this.logger?.logWarn('Page load timeout was detected.');
        }

        return { loadTimeout, operationResult };
    }

    private async detectRedirection(url: string, page: Puppeteer.Page): Promise<RedirectResult> {
        const operationResult = await this.traceRedirect(url, page);

        const indirectRedirect = this.getIndirectRequests(url);
        if (indirectRedirect.length > 0) {
            this.logger?.logWarn('Page indirect redirection was detected.', {
                redirect: JSON.stringify(indirectRedirect.map((r) => r.url)),
            });
        }

        return {
            redirection: indirectRedirect.length > 0,
            navigationResult: operationResult,
            lastHttpResponse: this.pageRequestInterceptor.interceptedRequests.at(-1)?.response,
        };
    }

    private async traceRedirect(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        this.pageRequestInterceptor.pageOnResponse = this.getPageOnResponseHandler(url);

        return this.pageRequestInterceptor.intercept(
            async () => this.navigate(url, page),
            page,
            puppeteerTimeoutConfig.redirectTimeoutMsec,
        );
    }

    private async navigate(url: string, page: Puppeteer.Page): Promise<PageOperationResult> {
        const timestamp = System.getTimestamp();
        try {
            this.logger?.logInfo('Navigate page to URL for analysis.');
            const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: puppeteerTimeoutConfig.navigationTimeoutMsec });

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

    private getIndirectRequests(url: string): InterceptedRequest[] {
        // Select server originated redirect
        const serverRedirects = this.pageRequestInterceptor.interceptedRequests
            .filter((r) => [301, 302, 303, 307, 308].includes(r.data?.status) && r.data?.location)
            .map((r) => r.data.location);
        // Exclude original URL
        serverRedirects.push(url);

        // Exclude server originated redirect
        return this.pageRequestInterceptor.interceptedRequests.filter((r) => !serverRedirects.includes(r.url));
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
