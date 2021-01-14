// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import Apify from 'apify';
import { GlobalLogger } from 'logger';
import 'reflect-metadata';
import { IMock, It, Mock } from 'typemoq';
import { UrlCollectionRequestProcessor } from './url-collection-request-processor';

describe(UrlCollectionRequestProcessor, () => {
    const requestInputs = {
        request: {
            url: 'url',
        },
    } as Apify.HandleRequestInputs;
    let loggerMock: IMock<GlobalLogger>;

    let testSubject: UrlCollectionRequestProcessor;

    beforeEach(() => {
        loggerMock = Mock.ofType<GlobalLogger>();

        testSubject = new UrlCollectionRequestProcessor(loggerMock.object);
    });

    it('handleRequest adds to UrlList', async () => {
        await testSubject.handleRequest(requestInputs);

        expect(await testSubject.getResults()).toEqual(['url']);
    });

    it('handleRequest adds multiple URLs to list', async () => {
        const requestInputs2 = {
            request: {
                url: 'url2',
            },
        } as Apify.HandleRequestInputs;

        await testSubject.handleRequest(requestInputs);
        await testSubject.handleRequest(requestInputs2);

        expect(await testSubject.getResults()).toEqual(['url', 'url2']);
    });

    it('handleFailedRequest logs error', async () => {
        const requestInputWithError = {
            request: requestInputs.request,
            error: new Error('error'),
        };
        loggerMock.setup((l) => l.logError(It.isAny(), It.isAny())).verifiable();

        await testSubject.handleRequestError(requestInputWithError);

        loggerMock.verifyAll();
    });
});
