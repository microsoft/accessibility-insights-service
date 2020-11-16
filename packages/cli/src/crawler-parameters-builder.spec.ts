// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import fs from 'fs';
import { IMock, Mock } from 'typemoq';
import { Url } from 'common';
import { CrawlerParametersBuilder } from './crawler-parameters-builder';
import { ScanArguments } from './scan-arguments';

let fileSystemMock: IMock<typeof fs>;
let crawlerParametersBuilder: CrawlerParametersBuilder;
let scanArguments: ScanArguments;

describe(CrawlerParametersBuilder, () => {
    beforeEach(() => {
        fileSystemMock = Mock.ofInstance(fs);
        crawlerParametersBuilder = new CrawlerParametersBuilder(Url, fileSystemMock.object);
    });

    afterEach(() => {
        fileSystemMock.verifyAll();
    });

    it('validate output data', () => {
        const inputUrls = ['https://localhost/article/kb-1', 'https://localhost/article/kb-2'];
        const fileUrls = ['https://localhost/article/kb-3', 'https://localhost/article/kb-4'];
        const fileContent = fileUrls.join('\n');
        scanArguments = {
            crawl: true,
            inputFile: 'inputFile.txt',
            inputUrls: inputUrls,
            url: 'https://localhost/',
            output: 'output',
            simulate: true,
            selectors: ['selector'],
            maxUrls: 1,
            restart: true,
            snapshot: true,
            memoryMBytes: 1024,
            silentMode: true,
            discoveryPatterns: ['regex'],
            continue: true,
        };
        fileSystemMock
            .setup((o) => o.existsSync(scanArguments.inputFile))
            .returns(() => true)
            .verifiable();
        fileSystemMock
            .setup((o) => o.readFileSync(scanArguments.inputFile, 'utf-8'))
            .returns(() => fileContent)
            .verifiable();
        const expectedCrawlOptions = {
            crawl: true,
            baseUrl: 'https://localhost/',
            simulate: true,
            selectors: ['selector'],
            localOutputDir: 'output',
            maxRequestsPerCrawl: 1,
            restartCrawl: true,
            snapshot: true,
            memoryMBytes: 1024,
            silentMode: true,
            inputUrls: [...inputUrls, ...fileUrls],
            discoveryPatterns: ['regex'],
        };
        const actualCrawlOptions = crawlerParametersBuilder.build(scanArguments);
        console.log(JSON.stringify(actualCrawlOptions));
        expect(actualCrawlOptions).toEqual(expectedCrawlOptions);
    });

    it('validate input urls not empty', () => {
        scanArguments = {
            inputUrls: [],
        };
        expect(() => crawlerParametersBuilder.build(scanArguments)).toThrowError(/Input URLs list does no have any URLs/);
    });

    it('validate input file not empty', () => {
        scanArguments = {
            inputFile: 'inputFile.txt',
        };
        fileSystemMock
            .setup((o) => o.existsSync(scanArguments.inputFile))
            .returns(() => true)
            .verifiable();
        fileSystemMock
            .setup((o) => o.readFileSync(scanArguments.inputFile, 'utf-8'))
            .returns(() => '')
            .verifiable();
        expect(() => crawlerParametersBuilder.build(scanArguments)).toThrowError(/Input file does not have any URLs/);
    });

    it('validate input file content parsing', () => {
        const urls = ['https://localhost/', 'https://localhost/', 'https://localhost/article/'];
        const fileContent = urls.join('\n');
        scanArguments = {
            inputFile: 'inputFile.txt',
        };
        fileSystemMock
            .setup((o) => o.existsSync(scanArguments.inputFile))
            .returns(() => true)
            .verifiable();
        fileSystemMock
            .setup((o) => o.readFileSync(scanArguments.inputFile, 'utf-8'))
            .returns(() => fileContent)
            .verifiable();
        const actualCrawlOptions = crawlerParametersBuilder.build(scanArguments);
        expect(actualCrawlOptions).toEqual({ inputUrls: [urls[0], urls[2]] });
    });

    it('validate input file exists', () => {
        scanArguments = {
            inputFile: 'inputFile.txt',
        };
        fileSystemMock
            .setup((o) => o.existsSync(scanArguments.inputFile))
            .returns(() => false)
            .verifiable();
        expect(() => crawlerParametersBuilder.build(scanArguments)).toThrowError(/Input file does not exist/);
    });

    it('validate base url', () => {
        scanArguments = {
            crawl: true,
            url: 'https://localhost/',
        };
        crawlerParametersBuilder.build(scanArguments);

        scanArguments.url = 'https://localhost/article/kb-7?language=en_US';
        expect(() => crawlerParametersBuilder.build(scanArguments)).toThrowError(/Crawl base URL should not have any query parameters/);
    });
});
