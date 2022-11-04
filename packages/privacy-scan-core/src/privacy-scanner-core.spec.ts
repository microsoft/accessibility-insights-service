// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { GlobalLogger } from 'logger';
import { Page, BrowserError } from 'scanner-global-library';
import { HTTPResponse, HTTPRequest } from 'puppeteer';
import { ConsentResult } from 'storage-documents';
import { System } from 'common';
import { PrivacyScannerCore } from './privacy-scanner-core';
import { PrivacyScenarioRunner } from './privacy-scenario-runner';
import { PrivacyResults } from './privacy-results';

const url = 'url';
const navigationalUri = 'navigational url';
const browserError = {
    statusCode: 404,
    message: 'page not found',
} as BrowserError;

let privacyScenarioRunnerMock: IMock<PrivacyScenarioRunner>;
let loggerMock: IMock<GlobalLogger>;
let pageMock: IMock<Page>;
let privacyScannerCore: PrivacyScannerCore;
let privacyResult: PrivacyResults;

describe(PrivacyScannerCore, () => {
    beforeEach(() => {
        privacyResult = {
            navigationalUri,
            cookieCollectionConsentResults: [],
        } as PrivacyResults;
        privacyScenarioRunnerMock = Mock.ofType<PrivacyScenarioRunner>();
        loggerMock = Mock.ofType<GlobalLogger>();
        pageMock = Mock.ofType<Page>();
        privacyScannerCore = new PrivacyScannerCore(privacyScenarioRunnerMock.object, loggerMock.object);
    });

    afterEach(() => {
        privacyScenarioRunnerMock.verifyAll();
        loggerMock.verifyAll();
        pageMock.verifyAll();
    });

    it('return error if banner not found', async () => {
        setupPageUrl();
        setupLastNavigationResponse();

        privacyResult.bannerDetected = false;
        privacyScenarioRunnerMock
            .setup((o) => o.run(url, pageMock.object))
            .returns(() => Promise.resolve(privacyResult))
            .verifiable();
        const expectedResult = {
            pageResponseCode: 200,
            scannedUrl: url,
            error: {
                errorType: 'BannerXPathNotDetected',
                message: 'Privacy banner was not detected.',
            },
            results: {
                bannerDetected: false,
                cookieCollectionConsentResults: [] as ConsentResult[],
                httpStatusCode: 200,
                navigationalUri,
                seedUri: url,
            },
        };

        const actualResult = await privacyScannerCore.scan(url, pageMock.object);
        delete (actualResult.error as BrowserError).stack; // remove stack trace

        expect(actualResult).toEqual(expectedResult);
    });

    it('scan with runner errors', async () => {
        setupPageUrl();
        setupLastNavigationResponse();

        privacyResult = {
            navigationalUri,
            cookieCollectionConsentResults: [
                {
                    error: {
                        statusCode: 401,
                    },
                },
                {
                    error: {
                        statusCode: 404,
                    },
                },
            ],
        } as PrivacyResults;
        privacyScenarioRunnerMock
            .setup((o) => o.run(url, pageMock.object))
            .returns(() => Promise.resolve(privacyResult))
            .verifiable();
        const expectedResult = {
            ...privacyResult.cookieCollectionConsentResults[0],
            pageResponseCode: privacyResult.cookieCollectionConsentResults[0].error.statusCode,
            results: {
                cookieCollectionConsentResults: privacyResult.cookieCollectionConsentResults,
                httpStatusCode: privacyResult.cookieCollectionConsentResults[0].error.statusCode,
                navigationalUri,
                seedUri: url,
            },
            scannedUrl: url,
        };

        const actualResult = await privacyScannerCore.scan(url, pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });

    it('scan with success', async () => {
        setupPageUrl();
        setupLastNavigationResponse();
        privacyScenarioRunnerMock
            .setup((o) => o.run(url, pageMock.object))
            .returns(() => Promise.resolve(privacyResult))
            .verifiable();
        const expectedResult = {
            pageResponseCode: 200,
            scannedUrl: url,
            results: {
                cookieCollectionConsentResults: [] as ConsentResult[],
                httpStatusCode: 200,
                navigationalUri,
                seedUri: url,
            },
        };

        const actualResult = await privacyScannerCore.scan(url, pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });

    it('return error result if privacy scenario runner has failed', async () => {
        setupPageUrl();
        setupLastNavigationResponse();
        privacyScenarioRunnerMock
            .setup((o) => o.run(url, pageMock.object))
            .returns(() => Promise.reject('runner error'))
            .verifiable();
        const error = new Error(System.serializeError('runner error'));
        const expectedResult = {
            error,
            scannedUrl: url,
        };

        const actualResult = await privacyScannerCore.scan(url, pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });

    it('return error result if navigation was unsuccessfully', async () => {
        pageMock
            .setup((o) => o.lastBrowserError)
            .returns(() => browserError)
            .verifiable(Times.atLeastOnce());
        const expectedResult = {
            error: {
                message: 'page not found',
                statusCode: 404,
            },
            pageResponseCode: 404,
        };

        const actualResult = await privacyScannerCore.scan(url, pageMock.object);

        expect(actualResult).toEqual(expectedResult);
    });
});

function setupPageUrl(): void {
    pageMock
        .setup((o) => o.url)
        .returns(() => url)
        .verifiable(Times.atLeastOnce());
}

function setupLastNavigationResponse(): void {
    pageMock
        .setup((o) => o.lastNavigationResponse)
        .returns(() => {
            return {
                status: () => 200,
                request: () => {
                    return { redirectChain: () => [{}] as HTTPRequest[] };
                },
            } as HTTPResponse;
        })
        .verifiable(Times.atLeastOnce());
}
