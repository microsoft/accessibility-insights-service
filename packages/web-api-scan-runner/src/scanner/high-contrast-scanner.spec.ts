// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { chromium, Browser, BrowserContext, Page, ConsoleMessage, Response } from '@playwright/test';
import { IMock, Mock, Times, It } from 'typemoq';
import { GlobalLogger } from 'logger';
import { PageResponseProcessor, BrowserError } from 'scanner-global-library';
import { HighContrastScanner } from './high-contrast-scanner';

jest.mock('@playwright/test');

describe(HighContrastScanner, () => {
    let loggerMock: IMock<GlobalLogger>;
    let pageResponseProcessorMock: IMock<PageResponseProcessor>;
    let browserMock: jest.Mocked<Browser>;
    let contextMock: jest.Mocked<BrowserContext>;
    let pageMock: jest.Mocked<Page>;
    let responseMock: jest.Mocked<Response>;
    let secretVaultProviderMock;
    let highContrastScanner: HighContrastScanner;

    const testUrl = 'https://example.com';

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        pageResponseProcessorMock = Mock.ofType<PageResponseProcessor>();
        secretVaultProviderMock = jest.fn().mockImplementation(() => Promise.resolve({ webScannerBypassKey: '1.0' }));

        browserMock = {
            newPage: jest.fn().mockImplementation(() => pageMock),
            newContext: jest.fn().mockImplementation(() => contextMock),
            close: jest.fn(),
        } as unknown as jest.Mocked<Browser>;

        contextMock = {
            newPage: jest.fn().mockImplementation(() => pageMock),
        } as unknown as jest.Mocked<BrowserContext>;

        pageMock = {
            on: jest.fn(),
            goto: jest.fn().mockImplementation(() => responseMock),
            evaluate: jest.fn().mockImplementation(() => 'userAgent'),
            close: jest.fn(),
        } as unknown as jest.Mocked<Page>;

        responseMock = {
            url: jest.fn().mockReturnValue(testUrl),
        } as unknown as jest.Mocked<Response>;

        (chromium.launch as jest.Mock).mockResolvedValue(browserMock);
        browserMock.newContext.mockResolvedValue(contextMock);
        contextMock.newPage.mockResolvedValue(pageMock);
        pageMock.goto.mockResolvedValue(responseMock);

        highContrastScanner = new HighContrastScanner(pageResponseProcessorMock.object, secretVaultProviderMock, loggerMock.object);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return pass result when no warnings are detected', async () => {
        const result = await highContrastScanner.scan(testUrl);

        expect(result).toEqual({
            result: 'pass',
            scannedUrl: testUrl,
        });
        loggerMock.verify((logger) => logger.logInfo('Starting high contrast CSS properties scan.'), Times.once());
        loggerMock.verify((logger) => logger.logInfo('The high contrast CSS properties scan is complete.'), Times.once());
        expect(browserMock.close).toHaveBeenCalledTimes(1);
    });

    it('should return fail result when warnings are detected', async () => {
        pageMock.on = jest.fn().mockImplementation((event, callback) => {
            if (event === 'console') {
                const consoleMessage = {
                    type: jest.fn().mockReturnValue('warning'),
                    text: jest.fn().mockReturnValue('-ms-high-contrast is deprecated'),
                } as unknown as ConsoleMessage;
                callback(consoleMessage);
            }
        });

        const result = await highContrastScanner.scan(testUrl);

        expect(result).toEqual({
            result: 'fail',
            scannedUrl: testUrl,
        });
        loggerMock.verify(
            (logger) =>
                logger.logWarn('Detected deprecated high contrast CSS properties.', {
                    scannedUrl: testUrl,
                    userAgent: 'userAgent',
                    warnings: JSON.stringify(['-ms-high-contrast is deprecated']),
                }),
            Times.once(),
        );
        expect(browserMock.close).toHaveBeenCalledTimes(1);
    });

    it('should return error result when navigation fails', async () => {
        const navigationError = new Error('Navigation error');
        pageMock.goto.mockRejectedValue(navigationError);

        const browserError: BrowserError = {
            errorType: 'NavigationError',
            message: 'Navigation failed',
            stack: 'stack trace',
        };
        pageResponseProcessorMock.setup((p) => p.getNavigationError(It.isAny())).returns(() => browserError);

        const result = await highContrastScanner.scan(testUrl);

        expect(result).toEqual({
            result: 'error',
            error: browserError,
        });
        expect(browserMock.close).toHaveBeenCalledTimes(1);
    });

    it('should handle unexpected errors gracefully', async () => {
        const unexpectedError = new Error('Unexpected error');
        (chromium.launch as jest.Mock).mockRejectedValue(unexpectedError);

        const result = await highContrastScanner.scan(testUrl);

        expect(result).toEqual({
            result: 'error',
            error: unexpectedError,
        });
        expect(browserMock.close).not.toHaveBeenCalled();
    });

    it('should close the browser after scan completes', async () => {
        await highContrastScanner.scan(testUrl);

        expect(browserMock.close).toHaveBeenCalledTimes(1);
    });
});
