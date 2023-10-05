// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock } from 'typemoq';
import { Page, PageAnalysisResult } from 'scanner-global-library';
import { WebsiteScanResult } from 'storage-documents';
import { createDiscoveryPattern } from '../crawler/discovery-pattern-factory';
import { PageMetadataGenerator } from './page-metadata-generator';

let pageMock: IMock<Page>;
let discoveryPatternFactoryMock: IMock<typeof createDiscoveryPattern>;
let websiteScanResult: WebsiteScanResult;
let pageAnalysisResult: PageAnalysisResult;
let pageMetadataGenerator: PageMetadataGenerator;

const url = 'http://localhost';
const generatedDiscoveryPattern = `^http(s?)://localhost(.*)`;

describe(PageMetadataGenerator, () => {
    beforeEach(() => {
        pageMock = Mock.ofType<Page>();
        discoveryPatternFactoryMock = Mock.ofType<typeof createDiscoveryPattern>();

        pageAnalysisResult = { redirection: false } as PageAnalysisResult;
        pageMock.setup((o) => o.pageAnalysisResult).returns(() => pageAnalysisResult);
        websiteScanResult = {} as WebsiteScanResult;
        discoveryPatternFactoryMock.setup((o) => o(url)).returns(() => generatedDiscoveryPattern);

        pageMetadataGenerator = new PageMetadataGenerator(pageMock.object);
    });

    afterEach(() => {
        pageMock.verifyAll();
        discoveryPatternFactoryMock.verifyAll();
    });

    it('return page metadata', async () => {
        websiteScanResult = { discoveryPatterns: [generatedDiscoveryPattern] } as WebsiteScanResult;
        pageAnalysisResult = {
            authentication: true,
            authenticationType: 'entraId',
            redirection: false,
            loadedUrl: url,
            url,
        } as PageAnalysisResult;
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            authentication: true,
            authenticationType: 'entraId',
            foreignLocation: false,
            loadedUrl: url,
            redirection: false,
            url,
        };

        const results = await pageMetadataGenerator.getMetadata(url, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location with discovery pattern', async () => {
        const loadedUrl = 'http://example.org';
        websiteScanResult = { discoveryPatterns: [generatedDiscoveryPattern] } as WebsiteScanResult;
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            url,
        };

        const results = await pageMetadataGenerator.getMetadata(url, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location with base URL', async () => {
        const loadedUrl = 'http://example.org';
        websiteScanResult = { baseUrl: url } as WebsiteScanResult;
        pageAnalysisResult = { redirection: true, loadedUrl } as PageAnalysisResult;
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            url,
        };

        const results = await pageMetadataGenerator.getMetadata(url, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });

    it('detect redirect to foreign location without base URL', async () => {
        const loadedUrl = 'http://example.org';
        pageAnalysisResult = { redirection: true, loadedUrl, url } as PageAnalysisResult;
        pageMock
            .setup((o) => o.analyze(url))
            .returns(() => Promise.resolve())
            .verifiable();
        const expectedPageMetadata = {
            foreignLocation: true,
            loadedUrl,
            redirection: true,
            url,
        };

        const results = await pageMetadataGenerator.getMetadata(url, websiteScanResult);

        expect(results).toEqual(expectedPageMetadata);
    });
});
