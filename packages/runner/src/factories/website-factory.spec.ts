import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { HashGenerator } from '../common/hash-generator';
import { ItemType } from '../documents/item-type';
import { RunState, ScanLevel } from '../documents/states';
import { WebsiteScanState } from '../documents/website';
import { ScanMetadata } from '../types/scan-metadata';
import { WebsiteFactory } from './website-factory';

describe('WebsiteFactory', () => {
    let hashGeneratorMock: IMock<HashGenerator>;
    let websiteFactory: WebsiteFactory;
    const scanMetadata: ScanMetadata = {
        websiteId: 'websiteId',
        websiteName: 'websiteName',
        baseUrl: 'scanMetadata-baseUrl',
        scanUrl: 'scanMetadata-scanUrl',
        serviceTreeId: 'serviceTreeId',
    };

    beforeEach(() => {
        hashGeneratorMock = Mock.ofType<HashGenerator>();
        hashGeneratorMock
            .setup(b => b.getWebsiteDocumentId(scanMetadata.baseUrl))
            .returns(() => 'baseUrl-hash-id')
            .verifiable(Times.once());
        hashGeneratorMock
            .setup(b => b.getWebsitePageDocumentId(scanMetadata.baseUrl, 'page-2-url'))
            .returns(() => 'page-2-id')
            .verifiable(Times.once());
        websiteFactory = new WebsiteFactory(hashGeneratorMock.object);
    });

    it('update existing document without page result', () => {
        const runTime = new Date();
        const sourceWebsite = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: new Date().toJSON(), level: ScanLevel.fail, scanState: WebsiteScanState.completed },
            lastPageScanResults: [
                {
                    id: 'page-scan-1-id',
                    pageId: 'page-1-id',
                    url: 'page-1-url',
                    lastUpdated: new Date().toJSON(),
                    level: ScanLevel.pass,
                    runState: RunState.completed,
                },
                {
                    id: 'page-scan-2-id',
                    pageId: 'page-2-id',
                    url: 'page-2-url',
                    lastUpdated: new Date().toJSON(),
                    level: ScanLevel.fail,
                    runState: RunState.completed,
                },
            ],
        };

        const pageScanResult = {
            id: 'page-scan-2-id',
            itemType: ItemType.pageScanResult,
            websiteId: scanMetadata.websiteId,
            url: 'page-2-url',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.failed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: runTime.toJSON(), level: ScanLevel.pass, scanState: WebsiteScanState.completedWithError },
            lastPageScanResults: [
                {
                    id: 'page-scan-1-id',
                    pageId: 'page-1-id',
                    url: 'page-1-url',
                    lastUpdated: sourceWebsite.lastPageScanResults[0].lastUpdated,
                    level: ScanLevel.pass,
                    runState: RunState.completed,
                },
                {
                    id: 'page-scan-2-id',
                    pageId: 'page-2-id',
                    url: 'page-2-url',
                    lastUpdated: runTime.toJSON(),
                    runState: RunState.failed,
                },
            ],
        };

        const result = websiteFactory.update(sourceWebsite, pageScanResult, runTime);

        expect(result).toEqual(expectedResult);
    });

    it('update existing document with page result', () => {
        const runTime = new Date();
        const sourceWebsite = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: new Date().toJSON(), level: ScanLevel.fail, scanState: WebsiteScanState.completed },
            lastPageScanResults: [
                {
                    id: 'page-scan-1-id',
                    pageId: 'page-1-id',
                    url: 'page-1-url',
                    lastUpdated: new Date().toJSON(),
                    level: ScanLevel.pass,
                    runState: RunState.completed,
                },
                {
                    id: 'page-scan-2-id',
                    pageId: 'page-2-id',
                    url: 'page-2-url',
                    lastUpdated: new Date().toJSON(),
                    level: ScanLevel.fail,
                    runState: RunState.completed,
                },
            ],
        };

        const pageScanResult = {
            id: 'page-scan-2-id',
            itemType: ItemType.pageScanResult,
            websiteId: scanMetadata.websiteId,
            url: 'page-2-url',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                result: {
                    runTime: runTime.toJSON(),
                    level: ScanLevel.pass,
                    issues: <string[]>[],
                },
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: runTime.toJSON(), level: ScanLevel.pass, scanState: WebsiteScanState.completed },
            lastPageScanResults: [
                {
                    id: 'page-scan-1-id',
                    pageId: 'page-1-id',
                    url: 'page-1-url',
                    lastUpdated: sourceWebsite.lastPageScanResults[0].lastUpdated,
                    level: ScanLevel.pass,
                    runState: RunState.completed,
                },
                {
                    id: 'page-scan-2-id',
                    pageId: 'page-2-id',
                    url: 'page-2-url',
                    lastUpdated: runTime.toJSON(),
                    level: ScanLevel.pass,
                    runState: RunState.completed,
                },
            ],
        };

        const result = websiteFactory.update(sourceWebsite, pageScanResult, runTime);

        expect(result).toEqual(expectedResult);
    });

    it('create new document without page result', () => {
        const runTime = new Date();
        const pageScanResult = {
            id: 'page-scan-2-id',
            itemType: ItemType.pageScanResult,
            websiteId: scanMetadata.websiteId,
            url: 'page-2-url',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.failed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: runTime.toJSON(), scanState: WebsiteScanState.completedWithError },
            lastPageScanResults: [
                {
                    id: pageScanResult.id,
                    pageId: 'page-2-id',
                    url: pageScanResult.url,
                    lastUpdated: runTime.toJSON(),
                    runState: pageScanResult.scan.run.state,
                },
            ],
        };

        const result = websiteFactory.create(pageScanResult, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });

    it('create new document with page result', () => {
        const runTime = new Date();
        const pageScanResult = {
            id: 'page-scan-2-id',
            itemType: ItemType.pageScanResult,
            websiteId: scanMetadata.websiteId,
            url: 'page-2-url',
            crawl: {
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
            scan: {
                result: {
                    runTime: runTime.toJSON(),
                    level: ScanLevel.pass,
                    issues: <string[]>[],
                },
                run: {
                    runTime: runTime.toJSON(),
                    state: RunState.completed,
                },
            },
        };

        const expectedResult = {
            id: 'baseUrl-hash-id',
            itemType: ItemType.website,
            websiteId: scanMetadata.websiteId,
            name: scanMetadata.websiteName,
            baseUrl: scanMetadata.baseUrl,
            serviceTreeId: scanMetadata.serviceTreeId,
            lastScanResult: { lastUpdated: runTime.toJSON(), level: ScanLevel.pass, scanState: WebsiteScanState.completed },
            lastPageScanResults: [
                {
                    id: pageScanResult.id,
                    pageId: 'page-2-id',
                    url: pageScanResult.url,
                    lastUpdated: runTime.toJSON(),
                    level: pageScanResult.scan.result.level,
                    runState: pageScanResult.scan.run.state,
                },
            ],
        };

        const result = websiteFactory.create(pageScanResult, scanMetadata, runTime);

        expect(result).toEqual(expectedResult);
        hashGeneratorMock.verifyAll();
    });
});
