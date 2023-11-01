// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, It, Mock } from 'typemoq';
import { Page, PageAnalysisResult } from 'scanner-global-library';
import { WebsiteScanResult } from 'storage-documents';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { PageMetadataGenerator } from './page-metadata-generator';
import { UrlLocationValidator } from './url-location-validator';

let pageMock: IMock<Page>;
let createDiscoveryPatternMock: IMock<typeof createDiscoveryPattern>;
let urlLocationValidatorMock: IMock<UrlLocationValidator>;
let websiteScanResult: WebsiteScanResult;
let pageAnalysisResult: PageAnalysisResult;
let pageMetadataGenerator: PageMetadataGenerator;

const url = 'http://localhost/path/';
const discoveryPatternWithPath = `^http(s?)://localhost/path(.*)`;
const discoveryPatternWithoutPath = `^http(s?)://localhost(.*)`;

describe(PageMetadataGenerator, () => {
    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        createDiscoveryPatternMock = Mock.ofType<typeof createDiscoveryPattern>();
        urlLocationValidatorMock = Mock.ofType<UrlLocationValidator>();
        websiteScanResult = {} as WebsiteScanResult;
        createDiscoveryPatternMock.setup((o) => o(url)).returns(() => discoveryPatternWithPath);
        createDiscoveryPatternMock.setup((o) => o(url, false)).returns(() => discoveryPatternWithoutPath);
        urlLocationValidatorMock.setup((o) => o.allowed(It.isAny())).returns(() => true);

        pageMetadataGenerator = new PageMetadataGenerator(urlLocationValidatorMock.object, createDiscoveryPatternMock.object);
    });

    afterEach(() => {
        pageMock.verifyAll();
        urlLocationValidatorMock.verifyAll();
        createDiscoveryPatternMock.verifyAll();
    });

    it('return page metadata for disallowed loaded URL', async () => {
        const loadedUrl = 'http://example.org';
        urlLocationValidatorMock.reset();
        urlLocationValidatorMock
            .setup((o) => o.allowed(url))
            .returns(() => true)
            .verifiable();
        urlLocationValidatorMock
            .setup((o) => o.allowed(loadedUrl))
            .returns(() => false)
            .verifiable();
        pageAnalysisResult = {
            url,
            authentication: true,
            authenticationType: 'entraId',
            redirection: false,
            loadedUrl,
        } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        const expectedPageMetadata = {
            url,
            allowed: false,
            authentication: true,
            authenticationType: 'entraId',
            foreignLocation: false,
            loadedUrl,
            redirection: false,
            browserError: {
                errorType: 'UnsupportedResource',
                message: 'The resource is not supported.',
            },
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('return page metadata', async () => {
        websiteScanResult = { discoveryPatterns: [discoveryPatternWithPath] } as WebsiteScanResult;
        pageAnalysisResult = {
            url,
            authentication: true,
            authenticationType: 'entraId',
            redirection: false,
            loadedUrl: url,
        } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            url,
            allowed: true,
            authentication: true,
            authenticationType: 'entraId',
            foreignLocation: false,
            loadedUrl: url,
            redirection: false,
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('allow scan for the same domain redirection', async () => {
        const loadedUrl = 'http://localhost/other-path/';
        websiteScanResult = { discoveryPatterns: [discoveryPatternWithPath] } as WebsiteScanResult;
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            url,
            allowed: true,
            foreignLocation: false,
            loadedUrl,
            redirection: true,
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location with discovery pattern', async () => {
        const loadedUrl = 'http://example.org';
        websiteScanResult = { discoveryPatterns: [discoveryPatternWithPath] } as WebsiteScanResult;
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            url,
            allowed: true,
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            browserError: {
                errorType: 'ForeignResourceRedirection',
                message: 'The resource was redirected to a foreign location.',
            },
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location with base URL', async () => {
        const loadedUrl = 'http://example.org';
        websiteScanResult = { baseUrl: url } as WebsiteScanResult;
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            url,
            allowed: true,
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            browserError: {
                errorType: 'ForeignResourceRedirection',
                message: 'The resource was redirected to a foreign location.',
            },
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location without base URL', async () => {
        const loadedUrl = 'http://example.org';
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            url,
            allowed: true,
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            browserError: {
                errorType: 'ForeignResourceRedirection',
                message: 'The resource was redirected to a foreign location.',
            },
        };

        const results = await pageMetadataGenerator.getMetadata(url, pageMock.object, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });
});
