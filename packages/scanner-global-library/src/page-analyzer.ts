// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';
import { injectable, inject, optional } from 'inversify';
import { System } from 'common';
import { GlobalLogger } from 'logger';
import { NavigationResponse, PageOperationResult } from './page-navigator';
import { PageNavigationTiming, puppeteerTimeoutConfig } from './page-timeout-config';
import { PageResponseProcessor } from './page-response-processor';
import { LoginPageDetector } from './authenticator/login-page-detector';

export interface PageAnalysisResult {
    redirection: boolean;
    authentication: boolean;
    navigationResponse: NavigationResponse;
}

interface RedirectChain {
    timestamp: number;
    url: string;
}

interface RedirectResult {
    redirection: boolean;
    operationResult: PageOperationResult;
}

@injectable()
export class PageAnalyzer {
    private redirectChain: RedirectChain[];

    constructor(
        @inject(PageResponseProcessor) public readonly pageResponseProcessor: PageResponseProcessor,
        @inject(LoginPageDetector) private readonly loginPageDetector: LoginPageDetector,
        @inject(GlobalLogger) @optional() private readonly logger: GlobalLogger,
    ) {}

    public async analyze(url: string, page: Puppeteer.Page): Promise<PageAnalysisResult> {
        const redirectResult = await this.detectRedirection(url, page);
        const authResult = this.detectAuth();

        return {
            redirection: redirectResult.redirection,
            authentication: authResult,
            navigationResponse: redirectResult.operationResult,
        };
    }

    private detectAuth(): boolean {
        let authDetected = false;
        for (const redirect of this.redirectChain) {
            const loginPageType = this.loginPageDetector.getLoginPageType(redirect.url);
            if (loginPageType !== undefined) {
                authDetected = true;
                this.logger?.logWarn('Page authentication was detected.', {
                    loginPageType,
                });

                break;
            }
        }

        return authDetected;
    }

    private async detectRedirection(url: string, page: Puppeteer.Page): Promise<RedirectResult> {
        this.redirectChain = [];

        await page.setRequestInterception(true);
        const pageOnRequestEventHandler = async (request: Puppeteer.HTTPRequest) => {
            try {
                if (request.isNavigationRequest() && request.redirectChain().length > 0) {
                    this.redirectChain.push({ timestamp: System.getTimestamp(), url: request.url() });
                }
            } catch (e) {
                this.logger?.logError(`Error handling 'request' page event`, { error: System.serializeError(e) });
            }

            await request.continue();
        };
        page.on('request', pageOnRequestEventHandler);

        const operationResult = await this.navigate(url, page);

        let lastRedirectChainCount = 0;
        await System.waitLoop(
            async () => {
                return this.redirectChain.length;
            },
            async (count) => {
                const lastCount = lastRedirectChainCount;
                lastRedirectChainCount = count;

                return lastCount === count;
            },
            puppeteerTimeoutConfig.redirectChainTimeoutMsecs,
            2000,
        );

        page.off('request', pageOnRequestEventHandler);
        await page.setRequestInterception(false);

        if (this.redirectChain.length > 0) {
            this.logger?.logWarn('Page redirection was detected.', {
                redirectChain: JSON.stringify(this.redirectChain),
            });
        }

        return {
            redirection: this.redirectChain.length > 0,
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
}
