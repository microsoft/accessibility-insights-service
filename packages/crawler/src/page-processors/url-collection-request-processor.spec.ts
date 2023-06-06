// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import * as Crawlee from '@crawlee/puppeteer';
import { GlobalLogger } from 'logger';
import { IMock, It, Mock } from 'typemoq';
import { UrlCollectionRequestProcessor } from './url-collection-request-processor';

describe(UrlCollectionRequestProcessor, () => {
    const context = {
        request: {
            url: 'url',
        },
    } as Crawlee.PuppeteerCrawlingContext;
    let loggerMock: IMock<GlobalLogger>;
    let testSubject: UrlCollectionRequestProcessor;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();
        testSubject = new UrlCollectionRequestProcessor(loggerMock.object);
    });

    it('requestHandler adds to UrlList', async () => {
        await testSubject.requestHandler(context);

        expect(testSubject.getResults()).toEqual(['url']);
    });

    it('requestHandler adds multiple URLs to list', async () => {
        const context2 = {
            request: {
                url: 'url2',
            },
        } as Crawlee.PuppeteerCrawlingContext;

        await testSubject.requestHandler(context);
        await testSubject.requestHandler(context2);

        expect(testSubject.getResults()).toEqual(['url', 'url2']);
    });

    it('requestHandler adds only html links to list', async () => {
        const context2 = {
            request: {
                url: 'url.xml',
            },
        } as Crawlee.PuppeteerCrawlingContext;
        await testSubject.requestHandler(context);
        await testSubject.requestHandler(context2);

        expect(testSubject.getResults()).toEqual(['url']);
    });

    it('handleFailedRequest logs error', async () => {
        const requestInputWithError = {
            request: {
                url: '',
            },
        } as Crawlee.PuppeteerCrawlingContext;
        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        await testSubject.failedRequestHandler(requestInputWithError, new Error('error'));

        loggerMock.verifyAll();
    });
});
